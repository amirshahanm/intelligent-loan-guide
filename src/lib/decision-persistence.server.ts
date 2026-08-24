import {
  semanticDecisionSnapshot,
  type AuthoritativeDecisionEnvelope,
} from "@/core/decision-envelope";
import type { IntentSlots } from "@/core/types";

type PersistDecisionContext = {
  sessionId?: string | null;
  sessionCapability?: string | null;
  caseId?: string | null;
  needText?: string | null;
};

export type DecisionPersistenceResult =
  | {
      status: "persisted";
      sessionId: string;
      sessionCapability: string;
      caseId: string;
      decisionRunId: string;
      reused: boolean;
    }
  | {
      status: "disabled";
      reason: "backend_not_configured";
    };

type RpcResult = {
  session_id: string;
  case_id: string;
  decision_run_id: string;
  reused: boolean;
};

type BackendConfig = { url: string; secret: string };

function isProductionDeployment(): boolean {
  return (process.env.TASHILRADAR_DEPLOYMENT_MODE ?? "").toLowerCase() === "production";
}

function backendConfig(): BackendConfig | null {
  const url =
    process.env.TASHILRADAR_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;
  const secret =
    process.env.TASHILRADAR_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) return null;
  return { url: url.replace(/\/$/, ""), secret };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      if (input[key] !== undefined) out[key] = canonicalize(input[key]);
    }
    return out;
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Hex(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : stableJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createCapabilityToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
    console.error("TashilRadar backend RPC failed", {
      rpc: name,
      status: response.status,
      body: body.slice(0, 1000),
    });
    throw new Error(`${name}_failed:${response.status}`);
  }
  return (await response.json()) as T;
}

async function verifyCapability(
  config: BackendConfig,
  sessionId: string,
  capability: string,
): Promise<boolean> {
  return rpc<boolean>(config, "tr_verify_session_capability", {
    p_session_id: sessionId,
    p_token_hash: await sha256Hex(capability),
  });
}

async function registerCapability(
  config: BackendConfig,
  sessionId: string,
  capability: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  await rpc<null>(config, "tr_register_session_capability", {
    p_session_id: sessionId,
    p_token_hash: await sha256Hex(capability),
    p_expires_at: expiresAt,
  });
}

export async function persistAuthoritativeDecision({
  slots,
  envelope,
  context,
}: {
  slots: IntentSlots;
  envelope: AuthoritativeDecisionEnvelope;
  context?: PersistDecisionContext;
}): Promise<DecisionPersistenceResult> {
  const config = backendConfig();
  if (!config) {
    if (isProductionDeployment()) throw new Error("production_backend_not_configured");
    return { status: "disabled", reason: "backend_not_configured" };
  }

  const existingSessionId = context?.sessionId ?? null;
  let capability = context?.sessionCapability ?? null;

  if (existingSessionId) {
    if (!capability || !(await verifyCapability(config, existingSessionId, capability))) {
      throw new Error("invalid_anonymous_session_capability");
    }
  } else {
    capability = createCapabilityToken();
  }

  const semanticOutput = semanticDecisionSnapshot(envelope);
  const inputHash = await sha256Hex(slots);
  const outputHash = await sha256Hex(semanticOutput);

  const result = await rpc<RpcResult>(config, "tr_persist_decision", {
    p_session_id: existingSessionId,
    p_case_id: context?.caseId ?? null,
    p_owner_user_id: null,
    p_need_text: context?.needText ?? null,
    p_world: envelope.primaryWorld,
    p_vertical: envelope.vertical,
    p_intent_snapshot: slots,
    p_engine_version: "reasoning-core-v1",
    p_ruleset_version: "founder-lock-2026-08-24",
    p_input_snapshot: slots,
    p_output_snapshot: semanticOutput,
    p_input_hash: inputHash,
    p_output_hash: outputHash,
    p_routes: envelope.persistableRoutes,
  });

  if (!result?.session_id || !result?.case_id || !result?.decision_run_id) {
    throw new Error("decision_persistence_invalid_response");
  }

  if (!existingSessionId) {
    await registerCapability(config, result.session_id, capability!);
  }

  return {
    status: "persisted",
    sessionId: result.session_id,
    sessionCapability: capability!,
    caseId: result.case_id,
    decisionRunId: result.decision_run_id,
    reused: Boolean(result.reused),
  };
}
