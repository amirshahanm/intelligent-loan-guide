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
  type LiquidityFactorKey,
  type LiquidityInput,
} from "./liquidity";

const failures: string[] = [];
function check(name: string, condition: boolean) {
  if (!condition) failures.push(name);
}

const allTrue = Object.fromEntries(
  LIQUIDITY_FACTORS.map((f) => [f.key, true as const]),
) as LiquidityInput;

const full = scoreLeadLiquidity(allTrue);
check("max weight sum is 100", LIQUIDITY_MAX_SCORE === 100);
check("all satisfied => 100", full.total === 100);
check("all satisfied => LIQUID", full.status === "LIQUID");
check("all satisfied => no missing", full.missingFactors.length === 0);

// Threshold boundaries.
check("80 => LIQUID", classifyLiquidity(80) === "LIQUID");
check("79 => NEAR_LIQUID", classifyLiquidity(79) === "NEAR_LIQUID");
check("60 => NEAR_LIQUID", classifyLiquidity(60) === "NEAR_LIQUID");
check("59 => DEVELOPMENT", classifyLiquidity(59) === "DEVELOPMENT");
check("40 => DEVELOPMENT", classifyLiquidity(40) === "DEVELOPMENT");
check("39 => NURTURE", classifyLiquidity(39) === "NURTURE");
check("0 => NURTURE", classifyLiquidity(0) === "NURTURE");

// Composite reaching exactly 80: 15+15+10+10+10+10+5+5 = 80
const eighty = scoreLeadLiquidity({
  credit_status_reviewed: true,
  guarantee_situation: true,
  exact_amount: true,
  deadline: true,
  installment_capacity: true,
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

// Empty input: nothing known, nothing rejected.
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

// Explicit false is distinct from unknown.
const negative = scoreLeadLiquidity({ deadline: false, exact_amount: true });
check("false is unmet not missing", negative.unmetFactors.includes("deadline"));
check("false not in missing", !negative.missingFactors.includes("deadline" as LiquidityFactorKey));
check("partial total", negative.total === 10);

// Determinism.
check(
  "deterministic",
  JSON.stringify(scoreLeadLiquidity(allTrue)) === JSON.stringify(scoreLeadLiquidity(allTrue)),
);

if (failures.length) {
  console.error("liquidity self-check FAILED:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log(`liquidity self-check passed (${LIQUIDITY_FACTORS.length} factors, max ${LIQUIDITY_MAX_SCORE})`);
