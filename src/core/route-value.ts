import type { CapabilityStatus, RouteFamilyMatch } from "./opportunity-routes";

export type RouteValuePhase = "prequote";

export type RouteValueBreakdown = {
  phase: RouteValuePhase;
  score: number;
  fit: number;
  executionReadiness: number;
  evidenceStrength: number;
  weights: {
    fit: number;
    executionReadiness: number;
    evidenceStrength: number;
  };
  notes: string[];
};

const EXECUTION_SCORE: Record<CapabilityStatus, number> = {
  ACTIVE: 100,
  PARTNER_REQUIRED: 55,
  COMING_SOON: 30,
  LICENSE_REQUIRED: 15,
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Pre-quote Route Value is deliberately conservative. It answers:
 * "How promising and executable is this route with the evidence we have now?"
 *
 * It does NOT claim final price/value. Verified quote economics are a later
 * layer and must not be fabricated from route-family metadata.
 */
export function scorePrequoteRouteValue(match: RouteFamilyMatch): RouteValueBreakdown {
  const fit = clamp(match.score);
  const executionReadiness = EXECUTION_SCORE[match.route.capabilityStatus];
  const evidenceStrength = match.route.demo ? 20 : 45;
  const weights = {
    fit: 0.55,
    executionReadiness: 0.3,
    evidenceStrength: 0.15,
  } as const;

  const score = clamp(
    fit * weights.fit +
      executionReadiness * weights.executionReadiness +
      evidenceStrength * weights.evidenceStrength,
  );

  const notes: string[] = [];
  if (match.route.demo) notes.push("داده و اتصال اجرایی این خانواده مسیر هنوز آزمایشی است.");
  if (match.route.capabilityStatus === "PARTNER_REQUIRED")
    notes.push("برای اجرا به شریک عملیاتی معتبر نیاز است.");
  if (match.route.capabilityStatus === "LICENSE_REQUIRED")
    notes.push("اجرای این مسیر به مجوز و/یا شریک مجاز وابسته است.");
  if (match.route.capabilityStatus === "COMING_SOON")
    notes.push("مسیر برای ثبت تقاضا مفید است اما اجرای زنده هنوز آماده نیست.");

  return {
    phase: "prequote",
    score,
    fit,
    executionReadiness,
    evidenceStrength,
    weights,
    notes,
  };
}
