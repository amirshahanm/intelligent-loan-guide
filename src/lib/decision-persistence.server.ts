import {
  semanticDecisionSnapshot,
  type AuthoritativeDecisionEnvelope,
} from "@/core/decision-envelope";
import type { IntentSlots } from "@/core/types";

type PersistDecisionContext = {
  sessionId?: string | null;
  caseId?: string | null;
  needText?: string | null;
};

export type DecisionPersistenceResult =
  | {
      status: "persisted";
      sessionId: string;
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

function isProductionDeployment(): boolean {
  return (process.env.TASHILRADAR_DEPLOYMENT_MODE ?? "").toLowerCase() === "production";
}

function backendConfig(): { url: string; secret: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

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
  const bytes = new TextEncoder().encode(stableJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
    if (isProductionDeployment()) {
      throw new Error("production_backend_not_configured");
    }
    return { status: "disabled", reason: "backend_not_configured" };
  }

  const semanticOutput = semanticDecisionSnapshot(envelope);
  const inputHash = await sha256Hex(slots);
  const outputHash = await sha256Hex(semanticOutput);

  const response = await fetch(`${config.url}/rest/v1/rpc/tr_persist_decision`, {
    method: "POST",
    headers: {
      apikey: config.secret,
      authorization: `Bearer ${config.secret}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      p_session_id: context?.sessionId ?? null,
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
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("TashilRadar decision persistence failed", {
      status: response.status,
      body: body.slice(0, 1000),
    });
    throw new Error(`decision_persistence_failed:${response.status}`);
  }

  const result = (await response.json()) as RpcResult;
  if (!result?.session_id || !result?.case_id || !result?.decision_run_id) {
    throw new Error("decision_persistence_invalid_response");
  }

  return {
    status: "persisted",
    sessionId: result.session_id,
    caseId: result.case_id,
    decisionRunId: result.decision_run_id,
    reused: Boolean(result.reused),
  };
}
