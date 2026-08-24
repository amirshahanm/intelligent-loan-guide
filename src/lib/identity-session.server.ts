import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";

const AUTH_COOKIE = "tashilradar_auth";
const WEB_SESSION_DAYS = 30;

type BackendConfig = { url: string; secret: string };

type ClaimInput = {
  phone: string;
  phoneHash: string;
  sessionId: string;
  caseId: string;
  sessionCapability: string;
};

function backendConfig(): BackendConfig {
  const url =
    process.env.TASHILRADAR_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;
  const secret =
    process.env.TASHILRADAR_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("identity_backend_not_configured");
  return { url: url.replace(/\/$/, ""), secret };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const config = backendConfig();
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: config.secret,
      authorization: `Bearer ${config.secret}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const responseBody = await response.text();
    console.error("Identity RPC failed", {
      name,
      status: response.status,
      body: responseBody.slice(0, 400),
    });
    throw new Error(`identity_rpc_failed:${name}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function createAuthUser(phone: string): Promise<string> {
  const config = backendConfig();
  const response = await fetch(`${config.url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: config.secret,
      authorization: `Bearer ${config.secret}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      phone,
      phone_confirm: true,
      user_metadata: { identity_source: "tashilradar_otp" },
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    const existing = await rpc<string | null>("tr_find_phone_identity", {
      p_phone_hash: await phoneMappingHash(phone),
    });
    if (existing) return existing;
    console.error("Supabase Auth user creation failed", {
      status: response.status,
      body: text.slice(0, 400),
    });
    throw new Error("auth_user_create_failed");
  }

  const payload = JSON.parse(text) as { id?: string; user?: { id?: string } };
  const id = payload.id ?? payload.user?.id;
  if (!id) throw new Error("auth_user_create_invalid_response");
  return id;
}

/**
 * This fallback hash is used only for a concurrency re-check. The canonical
 * mapping hash is supplied by the OTP flow using the server-only OTP pepper.
 */
async function phoneMappingHash(phone: string): Promise<string> {
  return sha256Hex(`fallback-phone:${phone}`);
}

async function resolveOrCreateAuthUser(phone: string, phoneHash: string): Promise<string> {
  const mapped = await rpc<string | null>("tr_find_phone_identity", {
    p_phone_hash: phoneHash,
  });
  if (mapped) return mapped;

  const userId = await createAuthUser(phone);
  await rpc<string>("tr_register_phone_identity", {
    p_phone_hash: phoneHash,
    p_user_id: userId,
  });
  return userId;
}

function cookieHeader(token: string, maxAgeSeconds: number): string {
  const secure = (process.env.TASHILRADAR_DEPLOYMENT_MODE ?? "").toLowerCase() === "production";
  return [
    `${AUTH_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : null,
    `Max-Age=${maxAgeSeconds}`,
  ]
    .filter(Boolean)
    .join("; ");
}

function readCookie(name: string): string | null {
  const raw = getRequestHeader("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function claimAnonymousSessionToPhone(input: ClaimInput): Promise<{
  userId: string;
  profileId: string;
}> {
  const userId = await resolveOrCreateAuthUser(input.phone, input.phoneHash);
  const webToken = randomToken();
  const webTokenHash = await sha256Hex(webToken);
  const expiresAt = new Date(Date.now() + WEB_SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const claimed = await rpc<{
    user_id: string;
    profile_id: string;
  }>("tr_claim_and_create_web_session", {
    p_session_id: input.sessionId,
    p_case_id: input.caseId,
    p_capability_hash: await sha256Hex(input.sessionCapability),
    p_user_id: userId,
    p_web_token_hash: webTokenHash,
    p_web_expires_at: expiresAt,
  });

  setResponseHeader("Set-Cookie", cookieHeader(webToken, WEB_SESSION_DAYS * 24 * 60 * 60));
  return { userId: claimed.user_id, profileId: claimed.profile_id };
}

export async function resolveCurrentUserId(): Promise<string | null> {
  const token = readCookie(AUTH_COOKIE);
  if (!token) return null;
  return rpc<string | null>("tr_resolve_web_session", {
    p_token_hash: await sha256Hex(token),
  });
}

export async function revokeCurrentWebSession(): Promise<void> {
  const token = readCookie(AUTH_COOKIE);
  if (token) {
    await rpc<boolean>("tr_revoke_web_session", {
      p_token_hash: await sha256Hex(token),
    });
  }
  setResponseHeader("Set-Cookie", cookieHeader("", 0));
}
