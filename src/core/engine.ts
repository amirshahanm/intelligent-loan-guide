/**
 * TashilRadar deterministic reasoning engine.
 *
 * Pure and isomorphic: the SAME module runs in the browser for instant
 * preview/Radar visualization and inside a server function for the
 * authoritative verdict. It contains no randomness — the Radar renders this
 * trace exactly, so no scan activity can ever be fabricated for effect.
 */

import { PRODUCTS, partnerById } from "./catalog";
import type {
  DebtLoad,
  EliminatedPath,
  EliminationReason,
  IncomeBand,
  IntentSlots,
  IRR,
  Match,
  MatchGap,
  NextAction,
  Product,
  Readiness,
  ReadinessScore,
  ReasoningStep,
  ReasoningTrace,
  SlotKey,
} from "./types";
import {
  COLLATERAL_FA,
  DEBT_FA,
  EMPLOYMENT_FA,
  GUARANTOR_FA,
  INCOME_FA,
  PURPOSE_FA,
} from "./labels";
import { formatTomanCompact } from "@/lib/money";

const INCOME_ORDER: IncomeBand[] = ["unknown", "under_20", "20_50", "50_100", "over_100"];
const DEBT_ORDER: DebtLoad[] = ["none", "light", "moderate", "heavy"];

function incomeRank(b: IncomeBand | undefined): number {
  return b ? INCOME_ORDER.indexOf(b) : 0;
}
function debtRank(d: DebtLoad | undefined): number {
  return d ? Math.max(0, DEBT_ORDER.indexOf(d)) : 0;
}

/* ------------------------------------------------------------------ */
/* Readiness                                                           */
/* ------------------------------------------------------------------ */

export function evaluateReadiness(slots: IntentSlots): Readiness {
  const dims: ReadinessScore[] = [];

  const known = (["amount", "purpose", "employment", "region"] as SlotKey[]).filter(
    (k) => slots[k] !== undefined,
  ).length;
  dims.push({
    dimension: "identity",
    score: Math.round((known / 4) * 100),
    label: "کامل‌بودن پروفایل",
    blocker: known < 3 ? "پروفایل هنوز کامل نیست" : undefined,
  });

  const employment = slots.employment?.value;
  const income = slots.incomeBand?.value;
  const incomeScore =
    income === undefined
      ? 30
      : income === "over_100"
        ? 100
        : income === "50_100"
          ? 85
          : income === "20_50"
            ? 65
            : 40;
  const stability =
    employment === "salaried"
      ? 15
      : employment === "business_owner"
        ? 10
        : employment === "unemployed"
          ? -25
          : 0;
  dims.push({
    dimension: "income",
    score: clamp(incomeScore + stability),
    label: income ? INCOME_FA[income] : "درآمد اعلام‌نشده",
    blocker: income === undefined ? "بازهٔ درآمد مشخص نیست" : undefined,
  });

  const collateral = slots.collateral?.value;
  dims.push({
    dimension: "collateral",
    score:
      collateral === "property"
        ? 100
        : collateral === "vehicle"
          ? 70
          : collateral === "deposit"
            ? 80
            : collateral === "none"
              ? 10
              : 35,
    label: collateral ? COLLATERAL_FA[collateral] : "وثیقه نامشخص",
    blocker: collateral === "none" ? "وثیقه‌ای در دسترس نیست" : undefined,
  });

  const guarantor = slots.guarantor?.value;
  dims.push({
    dimension: "guarantor",
    score:
      guarantor === "payroll"
        ? 100
        : guarantor === "business"
          ? 80
          : guarantor === "none"
            ? 10
            : 35,
    label: guarantor ? GUARANTOR_FA[guarantor] : "ضامن نامشخص",
    blocker: guarantor === "none" ? "ضامنی معرفی نشده است" : undefined,
  });

  dims.push({
    dimension: "credit_signal",
    score: 45,
    label: "بررسی اعتباری انجام نشده",
    blocker: "گزارش اعتباری هنوز دریافت نشده است",
  });

  const debt = slots.debtLoad?.value;
  dims.push({
    dimension: "debt_load",
    score:
      debt === "none"
        ? 100
        : debt === "light"
          ? 70
          : debt === "moderate"
            ? 45
            : debt === "heavy"
              ? 25
              : 50,
    label: debt ? DEBT_FA[debt] : "بدهی نامشخص",
    blocker: debt === "heavy" ? "بار بدهی فعلی بالاست" : undefined,
  });

  const total = Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length);
  return {
    total,
    dimensions: dims,
    blockers: dims.map((d) => d.blocker).filter((b): b is string => Boolean(b)),
  };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/* ------------------------------------------------------------------ */
/* Elimination                                                         */
/* ------------------------------------------------------------------ */

type Evaluation = {
  product: Product;
  eliminations: EliminationReason[];
  gaps: MatchGap[];
  matchedBecause: string[];
};

function evaluateProduct(product: Product, slots: IntentSlots): Evaluation {
  const r = product.rules;
  const eliminations: EliminationReason[] = [];
  const gaps: MatchGap[] = [];
  const matchedBecause: string[] = [];

  const amount = slots.amount?.value;
  if (amount !== undefined) {
    if (amount > r.maxAmount) {
      eliminations.push({
        ruleId: "amount_above_max",
        message: `سقف این محصول ${formatTomanCompact(r.maxAmount)} است و کمتر از مبلغ درخواستی توست.`,
        slots: ["amount"],
      });
    } else if (amount < r.minAmount) {
      eliminations.push({
        ruleId: "amount_below_min",
        message: `حداقل مبلغ این محصول ${formatTomanCompact(r.minAmount)} است.`,
        slots: ["amount"],
      });
    } else {
      matchedBecause.push(`مبلغ درخواستی در بازهٔ این محصول قرار دارد.`);
    }
  }

  const purpose = slots.purpose?.value;
  if (purpose && purpose !== "unknown" && !r.allowedPurposes.includes(purpose)) {
    eliminations.push({
      ruleId: "purpose_mismatch",
      message: `این محصول برای «${PURPOSE_FA[purpose]}» تعریف نشده است.`,
      slots: ["purpose"],
    });
  } else if (purpose && r.allowedPurposes.includes(purpose)) {
    matchedBecause.push(`هدف «${PURPOSE_FA[purpose]}» با این محصول سازگار است.`);
  }

  const employment = slots.employment?.value;
  if (employment && employment !== "unknown") {
    if (!r.allowedEmployment.includes(employment)) {
      eliminations.push({
        ruleId: "employment_mismatch",
        message: `این محصول برای «${EMPLOYMENT_FA[employment]}» ارائه نمی‌شود.`,
        slots: ["employment"],
      });
    } else {
      matchedBecause.push(`وضعیت شغلی «${EMPLOYMENT_FA[employment]}» پذیرفته می‌شود.`);
    }
  } else {
    gaps.push({
      ruleId: "employment_unknown",
      message: "وضعیت شغلی هنوز مشخص نیست.",
      distance: 0.5,
    });
  }

  if (r.requiresCollateral) {
    const c = slots.collateral?.value;
    if (c === "none") {
      eliminations.push({
        ruleId: "collateral_required",
        message: `این مسیر بدون ${r.requiresCollateral.map((x) => COLLATERAL_FA[x]).join(" یا ")} باز نمی‌شود.`,
        slots: ["collateral"],
      });
    } else if (c === undefined || c === "unknown") {
      gaps.push({
        ruleId: "collateral_unknown",
        message: `نیازمند ${r.requiresCollateral.map((x) => COLLATERAL_FA[x]).join(" یا ")} است؛ هنوز مشخص نکرده‌ای.`,
        distance: 0.6,
      });
    } else if (!r.requiresCollateral.includes(c)) {
      eliminations.push({
        ruleId: "collateral_type_mismatch",
        message: `نوع وثیقهٔ موردنیاز ${r.requiresCollateral.map((x) => COLLATERAL_FA[x]).join(" یا ")} است.`,
        slots: ["collateral"],
      });
    } else {
      matchedBecause.push(`${COLLATERAL_FA[c]} شرط وثیقه را پوشش می‌دهد.`);
    }
  } else if (slots.collateral?.value === "none") {
    matchedBecause.push("بدون نیاز به وثیقه.");
  }

  if (r.requiresGuarantor) {
    const g = slots.guarantor?.value;
    if (g === "none") {
      eliminations.push({
        ruleId: "guarantor_required",
        message: `این مسیر بدون ${r.requiresGuarantor.map((x) => GUARANTOR_FA[x]).join(" یا ")} باز نمی‌شود.`,
        slots: ["guarantor"],
      });
    } else if (g === undefined || g === "unknown") {
      gaps.push({
        ruleId: "guarantor_unknown",
        message: `نیازمند ${r.requiresGuarantor.map((x) => GUARANTOR_FA[x]).join(" یا ")} است؛ هنوز مشخص نکرده‌ای.`,
        distance: 0.55,
      });
    } else if (!r.requiresGuarantor.includes(g)) {
      eliminations.push({
        ruleId: "guarantor_type_mismatch",
        message: `نوع ضامن موردنیاز ${r.requiresGuarantor.map((x) => GUARANTOR_FA[x]).join(" یا ")} است.`,
        slots: ["guarantor"],
      });
    } else {
      matchedBecause.push(`${GUARANTOR_FA[g]} شرط ضمانت را پوشش می‌دهد.`);
    }
  } else if (slots.guarantor?.value === "none") {
    matchedBecause.push("بدون نیاز به ضامن.");
  }

  const income = slots.incomeBand?.value;
  if (income && income !== "unknown") {
    if (incomeRank(income) < incomeRank(r.minIncomeBand)) {
      eliminations.push({
        ruleId: "income_below_min",
        message: `حداقل درآمد موردنیاز «${INCOME_FA[r.minIncomeBand]}» است.`,
        slots: ["incomeBand"],
      });
    }
  } else if (incomeRank(r.minIncomeBand) > 1) {
    gaps.push({
      ruleId: "income_unknown",
      message: "بازهٔ درآمد برای این محصول تعیین‌کننده است.",
      distance: 0.4,
    });
  }

  const debt = slots.debtLoad?.value;
  if (debt && debtRank(debt) > debtRank(r.maxDebtLoad)) {
    eliminations.push({
      ruleId: "debt_too_high",
      message: "بار بدهی فعلی از حد قابل قبول این محصول بیشتر است.",
      slots: ["debtLoad"],
    });
  }

  return { product, eliminations, gaps, matchedBecause };
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

function fitScore(e: Evaluation, slots: IntentSlots): number {
  let score = 100;
  for (const g of e.gaps) score -= g.distance * 28;

  const rates = PRODUCTS.map((p) => p.ratePercent);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  score -= ((e.product.ratePercent - min) / (max - min || 1)) * 14;

  const urgency = slots.urgency?.value;
  if (urgency === "immediate") score -= Math.min(16, e.product.typicalDays * 0.5);
  else if (urgency === "weeks") score -= Math.min(8, e.product.typicalDays * 0.2);

  const amount = slots.amount?.value;
  if (amount) {
    const headroom = e.product.rules.maxAmount / amount;
    if (headroom < 1.15) score -= 6;
  }
  score += Math.min(8, e.matchedBecause.length * 2);
  return clamp(score);
}

function buildNextActions(e: Evaluation, slots: IntentSlots): NextAction[] {
  const actions: NextAction[] = [];
  for (const g of e.gaps) {
    if (g.ruleId === "guarantor_unknown")
      actions.push({
        id: `${e.product.id}_guarantor`,
        label: "وضعیت ضامن را مشخص کن",
        detail: g.message,
        unlocks: e.product.name,
        kind: "slot",
      });
    if (g.ruleId === "collateral_unknown")
      actions.push({
        id: `${e.product.id}_collateral`,
        label: "وضعیت وثیقه را مشخص کن",
        detail: g.message,
        unlocks: e.product.name,
        kind: "slot",
      });
    if (g.ruleId === "income_unknown")
      actions.push({
        id: `${e.product.id}_income`,
        label: "بازهٔ درآمد را اعلام کن",
        detail: g.message,
        unlocks: e.product.name,
        kind: "slot",
      });
    if (g.ruleId === "employment_unknown")
      actions.push({
        id: `${e.product.id}_employment`,
        label: "وضعیت شغلی را مشخص کن",
        detail: g.message,
        unlocks: e.product.name,
        kind: "slot",
      });
  }
  if (e.gaps.length === 0) {
    actions.push({
      id: `${e.product.id}_handoff`,
      label: "ارجاع به کارشناس",
      detail: "پروندهٔ آماده‌شده برای بررسی انسانی ارسال می‌شود.",
      unlocks: e.product.name,
      kind: "handoff",
    });
  }
  if (!slots.incomeBand) {
    actions.push({
      id: `${e.product.id}_credit`,
      label: "بررسی سیگنال اعتباری",
      detail: "نتیجهٔ اعتباری، دقت رتبه‌بندی مسیرها را بالا می‌برد.",
      kind: "credit",
    });
  }
  return actions;
}

/* ------------------------------------------------------------------ */
/* Run                                                                 */
/* ------------------------------------------------------------------ */

let runCounter = 0;

export type RunOptions = {
  computedBy?: "client-preview" | "server-authoritative";
  now?: string;
  runId?: string;
};

export function runReasoning(slots: IntentSlots, options: RunOptions = {}): ReasoningTrace {
  const now = options.now ?? new Date().toISOString();
  const computedBy = options.computedBy ?? "client-preview";
  const slotsUsed = (Object.keys(slots) as SlotKey[]).filter((k) => slots[k] !== undefined);

  const steps: ReasoningStep[] = [];
  const eliminated: EliminatedPath[] = [];
  const survivors: Evaluation[] = [];

  for (const product of PRODUCTS) {
    const partner = partnerById(product.partnerId);
    const evaluation = evaluateProduct(product, slots);
    steps.push({
      phase: "scan",
      productId: product.id,
      productName: product.name,
      partnerName: partner.name,
      outcome: "evaluating",
      note: "در حال بررسی شرایط",
    });

    if (evaluation.eliminations.length > 0) {
      eliminated.push({
        productId: product.id,
        productName: product.name,
        partnerName: partner.name,
        reasons: evaluation.eliminations,
      });
      steps.push({
        phase: "detect",
        productId: product.id,
        productName: product.name,
        partnerName: partner.name,
        outcome: "eliminated",
        note: evaluation.eliminations[0].message,
      });
    } else {
      survivors.push(evaluation);
    }
  }

  const scored = survivors
    .map((e) => ({ e, score: fitScore(e, slots) }))
    .sort((a, b) => b.score - a.score);

  const amount = slots.amount?.value;
  const matches: Match[] = scored.map(({ e, score }, index) => {
    const partner = partnerById(e.product.partnerId);
    const reachable: IRR = amount
      ? Math.min(amount, e.product.rules.maxAmount)
      : e.product.rules.maxAmount;
    const tier: Match["tier"] =
      e.gaps.length === 0 && index === 0 && score >= 60 ? "primary" : "near";
    steps.push({
      phase: tier === "primary" ? "resolve" : "connect",
      productId: e.product.id,
      productName: e.product.name,
      partnerName: partner.name,
      outcome: tier,
      note:
        tier === "primary"
          ? "بهترین تطابق بر اساس شرایط فعلی"
          : (e.gaps[0]?.message ?? "مسیر نزدیک، نیازمند تکمیل اطلاعات"),
    });
    return {
      productId: e.product.id,
      productName: e.product.name,
      partnerId: partner.id,
      partnerName: partner.name,
      fitScore: score,
      tier,
      ratePercent: e.product.ratePercent,
      maxTermMonths: e.product.maxTermMonths,
      typicalDays: e.product.typicalDays,
      reachableAmount: reachable,
      matchedBecause: e.matchedBecause,
      gaps: e.gaps,
      nextActions: buildNextActions(e, slots),
      asOf: e.product.asOf,
      demo: true as const,
    };
  });

  const seen = new Set<string>();
  const nextActions = matches
    .flatMap((m) => m.nextActions)
    .filter((a) => {
      const key = a.label;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);

  runCounter += 1;

  return {
    runId: options.runId ?? `run_${runCounter}_${slotsUsed.length}`,
    at: now,
    computedBy,
    slotsUsed,
    evaluatedCount: PRODUCTS.length,
    steps,
    readiness: evaluateReadiness(slots),
    eliminated,
    matches,
    nextActions,
  };
}

export function traceTally(trace: ReasoningTrace) {
  return {
    evaluated: trace.evaluatedCount,
    eliminated: trace.eliminated.length,
    near: trace.matches.filter((m) => m.tier === "near").length,
    primary: trace.matches.filter((m) => m.tier === "primary").length,
  };
}
