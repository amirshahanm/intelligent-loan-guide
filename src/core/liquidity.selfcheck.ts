/**
 * Deterministic self-check for the Lead Liquidity Engine.
 * Run with: bun run src/core/liquidity.selfcheck.ts
 * Pure module, never imported by the app.
 */

import {
  LIQUIDITY_FACTORS,
  LIQUIDITY_MAX_SCORE,
  classifyLiquidity,
  scoreLeadLiquidity,
  type LiquidityInput,
} from "./liquidity";

const failures: string[] = [];
function check(name: string, condition: boolean) {
  if (!condition) failures.push(name);
}

const ALL_SATISFIED: LiquidityInput = {
  exact_amount: "known",
  deadline: "known",
  installment_capacity: "known",
  credit_status_reviewed: "reviewed",
  guarantee_situation: "known",
  route_flexibility: true,
  initial_documents: true,
  responsiveness: true,
  decision_maker: true,
  cost_readiness: true,
};

const full = scoreLeadLiquidity(ALL_SATISFIED);
check("max weight sum is 100", LIQUIDITY_MAX_SCORE === 100);
check("all satisfied => 100", full.total === 100);
check("all satisfied => LIQUID", full.status === "LIQUID");
check("all satisfied => no missing", full.missingFactors.length === 0);
check("all satisfied => no unmet", full.unmetFactors.length === 0);

// Threshold boundaries.
check("80 => LIQUID", classifyLiquidity(80) === "LIQUID");
check("79 => NEAR_LIQUID", classifyLiquidity(79) === "NEAR_LIQUID");
check("60 => NEAR_LIQUID", classifyLiquidity(60) === "NEAR_LIQUID");
check("59 => DEVELOPMENT", classifyLiquidity(59) === "DEVELOPMENT");
check("40 => DEVELOPMENT", classifyLiquidity(40) === "DEVELOPMENT");
check("39 => NURTURE", classifyLiquidity(39) === "NURTURE");
check("0 => NURTURE", classifyLiquidity(0) === "NURTURE");

// Composite reaching exactly 80: 15+15+10+10+10+10+5+5
const eighty = scoreLeadLiquidity({
  credit_status_reviewed: "reviewed",
  guarantee_situation: "known",
  exact_amount: "known",
  deadline: "known",
  installment_capacity: "known",
  route_flexibility: true,
  responsiveness: true,
  decision_maker: true,
});
check("composite 80 total", eighty.total === 80);
check("composite 80 LIQUID", eighty.status === "LIQUID");
check(
  "composite 80 missing = documents + cost",
  eighty.missingFactors.join(",") === "initial_documents,cost_readiness",
);

/* --- Corrected clarity semantics ---------------------------------- */

// Credit reviewed with a blocker outcome still earns 15: the outcome belongs
// to the eligibility engine, not to liquidity.
const reviewed = scoreLeadLiquidity({ credit_status_reviewed: "reviewed" });
check("reviewed credit earns 15", reviewed.total === 15);
check("reviewed credit is satisfied", reviewed.factors[3].satisfied);
check("reviewed credit not missing", !reviewed.missingFactors.includes("credit_status_reviewed"));

// A confirmed "no guarantee" is still a known fact => full 15 points.
const noGuarantee = scoreLeadLiquidity({ guarantee_situation: "known" });
check("known guarantee (even none) earns 15", noGuarantee.total === 15);
check("guarantee never unmet", noGuarantee.unmetFactors.length === 0);

// Low but known installment capacity still earns its 10.
const lowCapacity = scoreLeadLiquidity({ installment_capacity: "known" });
check("known capacity earns 10", lowCapacity.total === 10);

// Clarity factors never land in unmetFactors.
const clarityOnly = scoreLeadLiquidity({ exact_amount: "known", deadline: "known" });
check("clarity total", clarityOnly.total === 20);
check("clarity never unmet", clarityOnly.unmetFactors.length === 0);
check(
  "clarity unknowns still missing",
  clarityOnly.missingFactors.includes("installment_capacity"),
);

/* --- Condition semantics ------------------------------------------ */

const conditions = scoreLeadLiquidity({
  route_flexibility: false,
  initial_documents: true,
  responsiveness: false,
});
check("condition total", conditions.total === 10);
check("false condition is unmet", conditions.unmetFactors.includes("route_flexibility"));
check("false condition not missing", !conditions.missingFactors.includes("route_flexibility"));
check("unstated condition is missing", conditions.missingFactors.includes("decision_maker"));

/* --- Empty input: nothing known, nothing rejected ------------------ */

const empty = scoreLeadLiquidity();
check("empty => 0", empty.total === 0);
check("empty => NURTURE", empty.status === "NURTURE");
check("empty => all missing", empty.missingFactors.length === LIQUIDITY_FACTORS.length);
check("empty => no unmet", empty.unmetFactors.length === 0);
check("empty => queue priority 4", empty.queue.priority === 4);
check(
  "unknown awards 0 for every factor",
  empty.factors.every((f) => f.awarded === 0 && !f.known && !f.satisfied && f.reason.length > 0),
);

// Determinism.
check(
  "deterministic",
  JSON.stringify(scoreLeadLiquidity(ALL_SATISFIED)) ===
    JSON.stringify(scoreLeadLiquidity(ALL_SATISFIED)),
);

if (failures.length) {
  console.error("liquidity self-check FAILED:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log(
  `liquidity self-check passed (${LIQUIDITY_FACTORS.length} factors, max ${LIQUIDITY_MAX_SCORE})`,
);
