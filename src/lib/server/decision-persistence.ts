import type { IntentSlots, ReasoningTrace } from "@/core/types";
import { discoverRouteFamilies, universalNeedFromLegacySlots } from "@/core/opportunity-routes";
import { callAdminRpc } from "./supabase-admin";
import {
  createSessionCapabilityToken,
  registerSessionCapability,
  verifySessionCapability,
} from "./session-capability";

export type PersistenceContext = {
  sessionId?: string;
  sessionCapability?: string;
  caseId?: string;
  ownerUserId?: string;
  needText?: string;
};

export type PersistedDecision = {
  sessionId: string;
  sessionCapability: string;
  caseId: string;
  decisionRunId: string;
  reused: boolean;
};

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)]),
    );
  }
  return value;
}

async function sha256Json(value: unknown): Promise<string> {
  const text = JSON.stringify(stable(value));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function verticalForNeed(kind: ReturnType<typeof universalNeedFromLegacySlots>["kind"]): string {
  switch (kind) {
    case "purchase_vehicle":
      return "vehicle";
    case "purchase_property":
      return "property";
    case "working_capital":
      return "working_capital";
    case "trade_import":
      return "import";
    case "trade_export":
      return "export";
    default:
      return "general";
  }
}

function worldVertical(slots: IntentSlots): { world: string; vertical: string } {
  const need = universalNeedFromLegacySlots(slots);
  const primary = discoverRouteFamilies(need)[0]?.route;
  return {
    world: primary?.world ?? "money",
    vertical: verticalForNeed(need.kind),
  };
}

function routeRows(slots: IntentSlots, trace: ReasoningTrace) {
  const need = universalNeedFromLegacySlots(slots);
  const vertical = verticalForNeed(need.kind);
  return discoverRouteFamilies(need).map((match, index) => ({
    route_key: match.route.id,
    world: match.route.world,
    vertical,
    route_type: match.route.kind,
    capability_status: match.route.capabilityStatus.toLowerCase(),
    rank: index + 1,
    fit_score: match.score,
    route_value_score: null,
    evidence_status: match.route.demo ? "demo" : "unverified",
    explanation: { summary: match.route.summaryFa, reason: match.reasonFa },
    requirements: [],
    next_actions: index === 0 ? trace.nextActions : [],
    demo: match.route.demo === true,
  }));
}

export async function persistAuthoritativeDecision(
  slots: IntentSlots,
  trace: ReasoningTrace,
  context: PersistenceContext,
): Promise<PersistedDecision> {
  let sessionId = context.sessionId;
  let capability = context.sessionCapability;

  if (sessionId) {
    if (!capability || !(await verifySessionCapability(sessionId, capability))) {
      throw new Error("invalid_anonymous_session_capability");
    }
  } else {
    capability = createSessionCapabilityToken();
  }

  const { world, vertical } = worldVertical(slots);
  const routes = routeRows(slots, trace);
  const inputSnapshot = { slots, needText: context.needText ?? null };
  const outputSnapshot = trace;

  const result = await callAdminRpc<{
    session_id: string;
    case_id: string;
    decision_run_id: string;
    reused: boolean;
  }>("tr_persist_decision", {
    p_session_id: sessionId ?? null,
    p_case_id: context.caseId ?? null,
    p_owner_user_id: context.ownerUserId ?? null,
    p_need_text: context.needText ?? "",
    p_world: world,
    p_vertical: vertical,
    p_intent_snapshot: slots,
    p_engine_version: "tashil-core-v2",
    p_ruleset_version: "2026-08-24",
    p_input_snapshot: inputSnapshot,
    p_output_snapshot: outputSnapshot,
    p_input_hash: await sha256Json(inputSnapshot),
    p_output_hash: await sha256Json(outputSnapshot),
    p_routes: routes,
  });

  sessionId = result.session_id;
  if (!context.sessionId) {
    await registerSessionCapability(sessionId, capability!);
  }

  return {
    sessionId,
    sessionCapability: capability!,
    caseId: result.case_id,
    decisionRunId: result.decision_run_id,
    reused: result.reused,
  };
}
