import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { sha256Hex } from "@/lib/decision-persistence.server";

const paymentAmountSchema = z.object({
  amountIrr: z.number().int().positive().max(10_000_000_000_000),
});

const paymentConfirmSchema = z.object({
  intentId: z.string().min(3).max(200),
});

const creditExecutionSchema = z.object({
  anonSessionId: z.string().min(6).max(120),
  consentGiven: z.literal(true),
  sessionId: z.string().uuid(),
  sessionCapability: z.string().min(32).max(256),
  caseId: z.string().uuid(),
});

type BackendConfig = { url: string; secret: string };

function backendConfig(): BackendConfig {
  const url =
    process.env.TASHILRADAR_SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secret =
    process.env.TASHILRADAR_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("credit_backend_not_configured");
  return { url: url.replace(/\/$/, ""), secret };
}

async function rpc<T>(config: BackendConfig, name: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: config.secret,
      authorization: `Bearer ${config.secret}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error("Credit backend RPC failed", { name, status: response.status, body: body.slice(0, 400) });
    throw new Error(`credit_backend_failure:${name}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

function noStore(): void {
  setResponseHeader("Cache-Control", "no-store");
}

export const createCreditPaymentIntent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => paymentAmountSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    const { consumeRequestLimit } = await import("@/lib/request-guard.server");
    await consumeRequestLimit({ scope: "credit_payment_create", limit: 8, windowSeconds: 10 * 60 });
    const { serverProviders } = await import("@/lib/providers/server-registry.server");
    return serverProviders.payment.createIntent(data.amountIrr);
  });

export const confirmCreditPaymentIntent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => paymentConfirmSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    const { consumeRequestLimit } = await import("@/lib/request-guard.server");
    await consumeRequestLimit({ scope: "credit_payment_confirm", limit: 12, windowSeconds: 10 * 60 });
    const { serverProviders } = await import("@/lib/providers/server-registry.server");
    return serverProviders.payment.confirm(data.intentId);
  });

export const executeCreditCheck = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => creditExecutionSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();

    const { consumeRequestLimit } = await import("@/lib/request-guard.server");
    await consumeRequestLimit({
      scope: "credit_check",
      limit: 4,
      windowSeconds: 60 * 60,
      subject: data.sessionId,
    });

    const config = backendConfig();
    await rpc<string>(config, "tr_record_consent_v2", {
      p_session_id: data.sessionId,
      p_case_id: data.caseId,
      p_token_hash: await sha256Hex(data.sessionCapability),
      p_scope: "credit_check",
      p_action: "granted",
      p_policy_version: "credit-consent-2026-08-25-v1",
      p_evidence: {
        channel: "web",
        explicit_checkbox: true,
        consent_copy: "credit-check-v1",
      },
    });

    const { serverProviders } = await import("@/lib/providers/server-registry.server");
    return serverProviders.credit.check({
      anonSessionId: data.anonSessionId,
      consentGiven: true,
      sessionId: data.sessionId,
      sessionCapability: data.sessionCapability,
      caseId: data.caseId,
    });
  });
