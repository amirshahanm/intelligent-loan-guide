import type { IntentSlots } from "./types";

/** Arithmetic on stated inputs, not a provider quote or affordability decision. */
export function purchaseBudget(slots: IntentSlots) {
  const capital = slots.availableCapital?.value;
  const budget = slots.spendingBudget?.value;
  const target = slots.targetPrice?.value;
  const values = [capital, budget, target, slots.monthlyPaymentCapacity?.value];
  if (values.some((value) => value !== undefined && (!Number.isSafeInteger(value) || value < 0))) {
    return { status: "invalid" as const };
  }
  if (capital !== undefined && budget !== undefined && budget > capital) {
    return { status: "conflict" as const };
  }
  if (budget === undefined || target === undefined) return { status: "incomplete" as const };
  return {
    status: "calculated" as const,
    fundingGapIrr: Math.max(0, target - budget),
    retainedCapitalIrr: capital === undefined ? null : capital - budget,
    source: "user_stated_arithmetic" as const,
  };
}
