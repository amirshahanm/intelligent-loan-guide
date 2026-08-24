import { runReasoning } from "./engine";
import {
  discoverRouteFamilies,
  type CapabilityStatus,
  type NeedKind,
  type RouteFamilyMatch,
  type UniversalNeed,
} from "./opportunity-routes";
import { universalNeedFromText } from "./universal-need-extract";
import type { IntentSlots, ReasoningTrace } from "./types";

export type PersistenceCapabilityStatus =
  | "active"
  | "coming_soon"
  | "partner_required"
  | "license_required";

export type PersistableRoute = {
  route_key: string;
  world: "money" | "buy" | "business" | "trade";
  vertical: string;
  route_type: string;
  capability_status: PersistenceCapabilityStatus;
  rank: number;
  fit_score: number;
  route_value_score: number | null;
  evidence_status: "demo" | "unverified";
  explanation: {
    titleFa: string;
    summaryFa: string;
    reasonFa: string;
  };
  requirements: unknown[];
  next_actions: unknown[];
  demo: boolean;
};

export type AuthoritativeDecisionEnvelope = {
  reasoning: ReasoningTrace;
  need: UniversalNeed;
  routeFamilies: RouteFamilyMatch[];
  primaryWorld: "money" | "buy" | "business" | "trade";
  vertical: string;
  persistableRoutes: PersistableRoute[];
};

export function persistenceCapabilityStatus(status: CapabilityStatus): PersistenceCapabilityStatus {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "COMING_SOON":
      return "coming_soon";
    case "PARTNER_REQUIRED":
      return "partner_required";
    case "LICENSE_REQUIRED":
      return "license_required";
  }
}

export function verticalForNeed(kind: NeedKind): string {
  switch (kind) {
    case "purchase_vehicle":
      return "vehicle";
    case "purchase_property":
      return "property";
    case "purchase_goods":
      return "commerce";
    case "working_capital":
      return "working_capital";
    case "equipment":
      return "equipment";
    case "trade_import":
      return "import";
    case "trade_export":
      return "export";
    case "cash":
      return "cash";
    case "unknown":
      return "general";
  }
}

export function toPersistableRoutes(
  routeFamilies: RouteFamilyMatch[],
  vertical: string,
): PersistableRoute[] {
  return routeFamilies.map((match, index) => ({
    route_key: match.route.id,
    world: match.route.world,
    vertical,
    route_type: match.route.kind,
    capability_status: persistenceCapabilityStatus(match.route.capabilityStatus),
    rank: index + 1,
    fit_score: match.score,
    route_value_score: null,
    evidence_status: match.route.demo ? "demo" : "unverified",
    explanation: {
      titleFa: match.route.titleFa,
      summaryFa: match.route.summaryFa,
      reasonFa: match.reasonFa,
    },
    requirements: [],
    next_actions:
      match.route.capabilityStatus === "ACTIVE"
        ? []
        : [
            {
              kind: "capture_demand",
              status: match.route.capabilityStatus,
              messageFa:
                "این مسیر هنوز اتصال اجرایی کامل ندارد؛ نیاز کاربر بدون ادعای اجرای زنده ثبت می‌شود.",
            },
          ],
    demo: Boolean(match.route.demo),
  }));
}

export function buildAuthoritativeDecisionEnvelope(
  slots: IntentSlots,
  needText?: string | null,
): AuthoritativeDecisionEnvelope {
  const reasoning = runReasoning(slots, { computedBy: "server-authoritative" });
  const need = universalNeedFromText(needText, slots);
  const routeFamilies = discoverRouteFamilies(need);
  const primaryWorld = routeFamilies[0]?.route.world ?? "money";
  const vertical = verticalForNeed(need.kind);

  return {
    reasoning,
    need,
    routeFamilies,
    primaryWorld,
    vertical,
    persistableRoutes: toPersistableRoutes(routeFamilies, vertical),
  };
}

/**
 * Volatile run metadata is intentionally excluded so retries of the same
 * substantive decision produce the same persistence fingerprint.
 */
export function semanticDecisionSnapshot(envelope: AuthoritativeDecisionEnvelope) {
  const { reasoning } = envelope;
  return {
    slotsUsed: reasoning.slotsUsed,
    evaluatedCount: reasoning.evaluatedCount,
    steps: reasoning.steps,
    readiness: reasoning.readiness,
    eliminated: reasoning.eliminated,
    matches: reasoning.matches,
    nextActions: reasoning.nextActions,
    need: envelope.need,
    routeFamilies: envelope.routeFamilies,
  };
}
