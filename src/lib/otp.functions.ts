import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const phoneSchema = z.string().min(10).max(18);
const challengeSchema = z.string().uuid();
const codeSchema = z.string().regex(/^\d{6}$/);

function deploymentMode(): string {
  return (process.env.TASHILRADAR_DEPLOYMENT_MODE ?? "demo").toLowerCase();
}

function normalizeIranPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return `+98${digits.slice(1)}`;
  if (/^989\d{9}$/.test(digits)) return `+${digits}`;
  if (/^00989\d{9}$/.test(digits)) return `+${digits.slice(2)}`;
  throw new Error("invalid_iran_mobile");
}

function backendConfig(): { url: string; secret: string; pepper: string } {
  const url =
    process.env.TASHILRADAR_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;
  const secret =
    process.env.TASHILRADAR_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;
  const pepper = process.env.TASHILRADAR_OTP_PEPPER;

  if (!url || !secret || !pepper) throw new Error("otp_backend_not_configured");
  return { url: url.replace(/\/$/, ""), secret, pepper };
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

function generateOtp(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
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
    const bodyText = await response.text();
    console.error("OTP backend RPC failed", {
      name,
      status: response.status,
      body: bodyText.slice(0, 300),
    });
    throw new Error("otp_backend_failure");
  }
  return (await response.json()) as T;
}

export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ phone: phoneSchema }).parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const phone = normalizeIranPhone(data.phone);
    const config = backendConfig();
    const phoneHash = await hmacHex(config.pepper, `phone:${phone}`);

    const { consumeRequestLimit } = await import("@/lib/request-guard.server");
    await consumeRequestLimit({
      scope: "otp_send",
      limit: 4,
      windowSeconds: 10 * 60,
      subject: phoneHash,
    });

    const code = generateOtp();
    const codeHash = await hmacHex(config.pepper, `otp:${phoneHash}:${code}`);
    const ttlSeconds = 120;

    const issued = await rpc<{ challenge_id: string; expires_at: string }>(
      "tr_issue_otp_challenge",
      {
        p_phone_hash: phoneHash,
        p_code_hash: codeHash,
        p_ttl_seconds: ttlSeconds,
      },
    );

    const { serverProviders } = await import("@/lib/providers/server-registry.server");
    const delivery = await serverProviders.sms.sendOtp(phone, code);
    if (!delivery.sent) throw new Error("otp_delivery_failed");

    const result: {
      sent: true;
      challengeId: string;
      expiresInSeconds: number;
      demo: boolean;
      demoCode?: string;
    } = {
      sent: true,
      challengeId: issued.challenge_id,
      expiresInSeconds: Math.min(delivery.expiresInSeconds, ttlSeconds),
      demo: serverProviders.sms.isMock,
    };

    if (serverProviders.sms.isMock && deploymentMode() !== "production") result.demoCode = code;
    return result;
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ phone: phoneSchema, challengeId: challengeSchema, code: codeSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const phone = normalizeIranPhone(data.phone);
    const config = backendConfig();
    const phoneHash = await hmacHex(config.pepper, `phone:${phone}`);

    const { consumeRequestLimit } = await import("@/lib/request-guard.server");
    await consumeRequestLimit({
      scope: "otp_verify",
      limit: 8,
      windowSeconds: 10 * 60,
      subject: phoneHash,
    });

    const codeHash = await hmacHex(config.pepper, `otp:${phoneHash}:${data.code}`);
    const result = await rpc<{ verified: boolean; reason: string }>("tr_verify_otp_challenge", {
      p_challenge_id: data.challengeId,
      p_phone_hash: phoneHash,
      p_code_hash: codeHash,
    });

    return { verified: Boolean(result.verified), reason: result.reason };
  });
