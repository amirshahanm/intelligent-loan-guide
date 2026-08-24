import {
  getRequestHeader,
  setResponseHeader,
  setResponseStatus,
} from "@tanstack/react-start/server";

type RateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
  reset_at: string;
};

function isProduction(): boolean {
  return (process.env.TASHILRADAR_DEPLOYMENT_MODE ?? "").toLowerCase() === "production";
}

function config(): { url: string; serviceKey: string; fingerprintSecret: string } | null {
  const url =
    process.env.TASHILRADAR_SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey =
    process.env.TASHILRADAR_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;
  const fingerprintSecret = process.env.TASHILRADAR_REQUEST_FINGERPRINT_SECRET;

  if (!url || !serviceKey || !fingerprintSecret) return null;
  return { url: url.replace(/\/$/, ""), serviceKey, fingerprintSecret };
}

function requestNetworkHint(): string {
  const cf = getRequestHeader("cf-connecting-ip");
  const trueClient = getRequestHeader("true-client-ip");
  const xff = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
  const real = getRequestHeader("x-real-ip");
  return cf ?? trueClient ?? xff ?? real ?? "unknown-network";
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function requestFingerprint(secret: string): Promise<string> {
  const userAgent = (getRequestHeader("user-agent") ?? "unknown-agent").slice(0, 220);
  const network = requestNetworkHint();
  return hmacHex(secret, `${network}\n${userAgent}`);
}

export async function consumeDecisionPersistenceLimit({
  existingSession,
}: {
  existingSession: boolean;
}): Promise<void> {
  const current = config();
  if (!current) {
    if (isProduction()) throw new Error("production_request_guard_not_configured");
    return;
  }

  const scope = existingSession ? "decision_resume" : "decision_new_session";
  const limit = existingSession ? 30 : 8;
  const windowSeconds = 10 * 60;
  const keyHash = await requestFingerprint(current.fingerprintSecret);

  const response = await fetch(`${current.url}/rest/v1/rpc/tr_consume_rate_limit`, {
    method: "POST",
    headers: {
      apikey: current.serviceKey,
      authorization: `Bearer ${current.serviceKey}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      p_key_hash: keyHash,
      p_scope: scope,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("TashilRadar rate-limit RPC failed", {
      status: response.status,
      body: body.slice(0, 500),
    });
    throw new Error("request_guard_backend_failure");
  }

  const result = (await response.json()) as RateLimitResult;
  if (!result.allowed) {
    const retryAfter = Math.max(
      1,
      Math.ceil((new Date(result.reset_at).getTime() - Date.now()) / 1000),
    );
    setResponseStatus(429);
    setResponseHeader("Retry-After", String(retryAfter));
    setResponseHeader("Cache-Control", "no-store");
    throw new Error(`request_rate_limited:${scope}`);
  }
}
