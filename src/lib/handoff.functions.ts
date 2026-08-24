import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { Handoff } from "@/lib/providers/types";

type BackendConfig = { url: string; secret: string };

type StoredDecision = {
  output_snapshot: {
    matches?: Array<{
      productId: string;
      productName: string;
      partnerName: string;
    }>;
  };
};

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function deploymentMode(): string {
  return (process.env.TASHILRADAR_DEPLOYMENT_MODE ?? "demo").toLowerCase();
}

function backendConfig(): BackendConfig {
  const url =
    process.env.TASHILRADAR_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;
  const secret =
    process.env.TASHILRADAR_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("handoff_backend_not_configured");
  return { url: url.replace(/\/$/, ""), secret };
}

async function rpc<T>(
  config: BackendConfig,
  name: string,
  payload: Record<string, unknown>,
): Promise<T> {
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
    console.error("Handoff backend RPC failed", {
      name,
      status: response.status,
      body: body.slice(0, 400),
    });
    throw new Error(`handoff_backend_failure:${name}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function adminGet<T>(config: BackendConfig, path: string): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: {
      apikey: config.secret,
      authorization: `Bearer ${config.secret}`,
      accept: "application/json",
    },
  });
  if (!response.ok) {
    const body = await response.text();
    console.error("Handoff backend read failed", {
      status: response.status,
      body: body.slice(0, 400),
    });
    throw new Error("handoff_backend_read_failure");
  }
  return (await response.json()) as T;
}

const continuitySchema = z.object({
  sessionId: z.string().uuid(),
  sessionCapability: z.string().min(32).max(256),
});

const requestSchema = continuitySchema.extend({
  caseId: z.string().uuid(),
  productId: z.string().min(1).max(160),
  anonSessionId: z.string().min(3).max(120),
});

async function assertCapability(
  config: BackendConfig,
  sessionId: string,
  capability: string,
): Promise<string> {
  const tokenHash = await sha256Hex(capability);
  const valid = await rpc<boolean>(config, "tr_verify_session_capability", {
    p_session_id: sessionId,
    p_token_hash: tokenHash,
  });
  if (!valid) throw new Error("invalid_anonymous_session_capability");
  return tokenHash;
}

async function authoritativeMatch(
  config: BackendConfig,
  caseId: string,
  productId: string,
): Promise<{ productId: string; productName: string; partnerName: string }> {
  const cases = await adminGet<Array<{ active_decision_run_id: string | null }>>(
    config,
    `tr_cases?select=active_decision_run_id&id=eq.${encodeURIComponent(caseId)}&limit=1`,
  );
  const decisionId = cases[0]?.active_decision_run_id;
  if (!decisionId) throw new Error("handoff_decision_not_found");

  const decisions = await adminGet<StoredDecision[]>(
    config,
    `tr_decision_runs?select=output_snapshot&id=eq.${encodeURIComponent(decisionId)}&limit=1`,
  );
  const match = decisions[0]?.output_snapshot?.matches?.find(
    (item) => item.productId === productId,
  );
  if (!match) throw new Error("handoff_product_not_in_authoritative_decision");
  return match;
}

export const requestHandoff = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const config = backendConfig();
    const tokenHash = await assertCapability(config, data.sessionId, data.sessionCapability);

    const { consumeRequestLimit } = await import("@/lib/request-guard.server");
    await consumeRequestLimit({
      scope: "handoff_request",
      limit: 5,
      windowSeconds: 60 * 60,
      subject: data.sessionId,
    });

    const match = await authoritativeMatch(config, data.caseId, data.productId);

    if (deploymentMode() === "production") {
      throw new Error("handoff_partner_not_configured");
    }

    const summary = `درخواست بررسی مسیر ${match.productName}`;
    const created = await rpc<{
      id: string;
      status: Handoff["status"];
      queue_position: number;
      created_at: string;
    }>(config, "tr_create_handoff_v2", {
      p_session_id: data.sessionId,
      p_case_id: data.caseId,
      p_token_hash: tokenHash,
      p_product_id: match.productId,
      p_product_name: match.productName,
      p_partner_name: match.partnerName,
      p_summary: summary,
      p_demo: true,
    });

    return {
      id: created.id,
      anonSessionId: data.anonSessionId,
      productId: match.productId,
      productName: match.productName,
      partnerName: match.partnerName,
      channel: "in_app" as const,
      status: created.status,
      queuePosition: created.queue_position,
      createdAt: created.created_at,
      summary,
      demo: true,
    } satisfies Handoff;
  });

export const getHandoff = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    continuitySchema.extend({ handoffId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const config = backendConfig();
    const tokenHash = await assertCapability(config, data.sessionId, data.sessionCapability);
    return rpc<Record<string, unknown> | null>(config, "tr_get_handoff_v2", {
      p_session_id: data.sessionId,
      p_token_hash: tokenHash,
      p_handoff_id: data.handoffId,
    });
  });

export const listHandoffs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => continuitySchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const config = backendConfig();
    const tokenHash = await assertCapability(config, data.sessionId, data.sessionCapability);
    return rpc<Array<Record<string, unknown>>>(config, "tr_list_handoffs_v2", {
      p_session_id: data.sessionId,
      p_token_hash: tokenHash,
    });
  });
