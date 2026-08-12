/**
 * TashilRadar — Lead Liquidity Engine V0.
 *
 * Pure, deterministic, isomorphic domain layer. No React, no DOM, no network,
 * no randomness, no time-dependent scoring. Not wired to any UI yet.
 *
 * Contract rules:
 *  - This engine NEVER rejects or deletes a lead. It only classifies it and
 *    recommends a queue priority.
 *  - Unknown/missing is an explicit third state (`undefined` or `"unknown"`),
 *    never silently coerced into a negative fact. Unknown awards 0 points and
 *    is surfaced through `missingFactors`.
 *  - Inputs are an explicit contract for the future pre-qualification / CRM
 *    layer. Liquidity facts are NEVER derived from unrelated IntentSlots
 *    (urgency is not a deadline, income band is not installment capacity).
 */

/* ------------------------------------------------------------------ */
/* Input contract                                                      */
/* ------------------------------------------------------------------ */

/** Tri-state fact: true = known/satisfied, false = explicitly not, unknown = unstated. */
export type TriState = true | false | "unknown";

export type LiquidityFactorKey =
  | "exact_amount"
  | "deadline"
  | "installment_capacity"
  | "route_flexibility"
  | "credit_status_reviewed"
  | "guarantee_situation"
  | "initial_documents"
  | "responsiveness"
  | "decision_maker"
  | "cost_readiness";

/**
 * Explicit liquidity input. Every field is optional; an omitted field is
 * treated exactly like `"unknown"` — missing, not negative.
 */
export type LiquidityInput = Partial<Record<LiquidityFactorKey, TriState>>;

export type LiquidityStatus = "LIQUID" | "NEAR_LIQUID" | "DEVELOPMENT" | "NURTURE";

export type LiquidityQueue = {
  /** 1 = highest. Deterministic mapping from status. */
  priority: 1 | 2 | 3 | 4;
  category: LiquidityStatus;
  label: string;
  recommendation: string;
};

export type LiquidityFactorResult = {
  key: LiquidityFactorKey;
  weight: number;
  /** true = satisfied/known, false = explicitly not satisfied, "unknown" = unstated. */
  state: TriState;
  known: boolean;
  satisfied: boolean;
  awarded: number;
  label: string;
  reason: string;
};

export type LiquidityResult = {
  /** 0..100 */
  total: number;
  status: LiquidityStatus;
  statusLabel: string;
  factors: LiquidityFactorResult[];
  missingFactors: LiquidityFactorKey[];
  unmetFactors: LiquidityFactorKey[];
  maxScore: number;
  queue: LiquidityQueue;
};

/* ------------------------------------------------------------------ */
/* Weights & labels                                                    */
/* ------------------------------------------------------------------ */

type FactorDef = {
  key: LiquidityFactorKey;
  weight: number;
  label: string;
  satisfiedReason: string;
  unsatisfiedReason: string;
  unknownReason: string;
};

export const LIQUIDITY_FACTORS: readonly FactorDef[] = [
  {
    key: "exact_amount",
    weight: 10,
    label: "مبلغ دقیق درخواستی",
    satisfiedReason: "مبلغ دقیق موردنیاز مشخص شده است.",
    unsatisfiedReason: "مبلغ دقیق موردنیاز هنوز نهایی نشده است.",
    unknownReason: "مبلغ دقیق موردنیاز پرسیده نشده است.",
  },
  {
    key: "deadline",
    weight: 10,
    label: "مهلت زمانی",
    satisfiedReason: "مهلت زمانی مشخص اعلام شده است.",
    unsatisfiedReason: "مهلت زمانی مشخصی وجود ندارد.",
    unknownReason: "مهلت زمانی هنوز بررسی نشده است.",
  },
  {
    key: "installment_capacity",
    weight: 10,
    label: "توان پرداخت قسط",
    satisfiedReason: "توان پرداخت قسط ماهانه مشخص است.",
    unsatisfiedReason: "توان پرداخت قسط کافی اعلام نشده است.",
    unknownReason: "توان پرداخت قسط هنوز سنجیده نشده است.",
  },
  {
    key: "route_flexibility",
    weight: 10,
    label: "انعطاف در مسیر یا بانک",
    satisfiedReason: "امکان انتخاب مسیر یا بانک جایگزین وجود دارد.",
    unsatisfiedReason: "کاربر روی یک مسیر یا بانک خاص محدود است.",
    unknownReason: "میزان انعطاف مسیر یا بانک مشخص نیست.",
  },
  {
    key: "credit_status_reviewed",
    weight: 15,
    label: "بررسی وضعیت اعتباری، چک و معوقات",
    satisfiedReason: "وضعیت اعتباری، چک و معوقات بررسی شده است.",
    unsatisfiedReason: "وضعیت اعتباری بررسی شده اما مانع دارد.",
    unknownReason: "وضعیت اعتباری، چک و معوقات هنوز بررسی نشده است.",
  },
  {
    key: "guarantee_situation",
    weight: 15,
    label: "وضعیت تضامین",
    satisfiedReason: "وضعیت ضامن یا وثیقه روشن است.",
    unsatisfiedReason: "تضمین قابل ارائه‌ای در دسترس نیست.",
    unknownReason: "وضعیت تضامین هنوز مشخص نشده است.",
  },
  {
    key: "initial_documents",
    weight: 10,
    label: "آمادگی مدارک اولیه",
    satisfiedReason: "مدارک اولیه آماده است.",
    unsatisfiedReason: "مدارک اولیه هنوز آماده نیست.",
    unknownReason: "وضعیت مدارک اولیه پرسیده نشده است.",
  },
  {
    key: "responsiveness",
    weight: 5,
    label: "پاسخ‌گویی فعال",
    satisfiedReason: "کاربر به‌صورت فعال پاسخ‌گو است.",
    unsatisfiedReason: "کاربر در تماس‌ها پاسخ‌گو نبوده است.",
    unknownReason: "میزان پاسخ‌گویی هنوز سنجیده نشده است.",
  },
  {
    key: "decision_maker",
    weight: 5,
    label: "تصمیم‌گیرنده بودن",
    satisfiedReason: "کاربر تصمیم‌گیرندهٔ واقعی پرونده است.",
    unsatisfiedReason: "تصمیم نهایی با شخص دیگری است.",
    unknownReason: "مشخص نیست تصمیم‌گیرندهٔ نهایی چه کسی است.",
  },
  {
    key: "cost_readiness",
    weight: 10,
    label: "آمادگی مالی برای هزینه‌های قانونی و اجرایی",
    satisfiedReason: "آمادگی مالی برای هزینه‌های قانونی و اجرایی وجود دارد.",
    unsatisfiedReason: "آمادگی مالی برای هزینه‌های قانونی و اجرایی وجود ندارد.",
    unknownReason: "آمادگی مالی برای هزینه‌های قانونی و اجرایی بررسی نشده است.",
  },
] as const;

export const LIQUIDITY_MAX_SCORE = LIQUIDITY_FACTORS.reduce((s, f) => s + f.weight, 0);

export const LIQUIDITY_STATUS_FA: Record<LiquidityStatus, string> = {
  LIQUID: "سرنخ نقدشونده",
  NEAR_LIQUID: "نزدیک به نقدشوندگی",
  DEVELOPMENT: "نیازمند توسعه",
  NURTURE: "در حال پرورش",
};

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

export function classifyLiquidity(total: number): LiquidityStatus {
  if (total >= 80) return "LIQUID";
  if (total >= 60) return "NEAR_LIQUID";
  if (total >= 40) return "DEVELOPMENT";
  return "NURTURE";
}

const QUEUE: Record<LiquidityStatus, LiquidityQueue> = {
  LIQUID: {
    priority: 1,
    category: "LIQUID",
    label: "صف اقدام فوری",
    recommendation: "پرونده آمادهٔ ارجاع فوری به کارشناس است.",
  },
  NEAR_LIQUID: {
    priority: 2,
    category: "NEAR_LIQUID",
    label: "صف تکمیل سریع",
    recommendation: "با تکمیل چند فاکتور باقی‌مانده، پرونده به مرحلهٔ اقدام می‌رسد.",
  },
  DEVELOPMENT: {
    priority: 3,
    category: "DEVELOPMENT",
    label: "صف توسعهٔ پرونده",
    recommendation: "نیازمند بررسی اعتباری و روشن‌شدن تضامین پیش از اقدام است.",
  },
  NURTURE: {
    priority: 4,
    category: "NURTURE",
    label: "صف پرورش بلندمدت",
    recommendation: "پرونده حفظ می‌شود و با پیگیری دوره‌ای تکمیل خواهد شد.",
  },
};

export function queueFor(status: LiquidityStatus): LiquidityQueue {
  return QUEUE[status];
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

function normalize(value: TriState | undefined): TriState {
  return value === true || value === false ? value : "unknown";
}

export function scoreLeadLiquidity(input: LiquidityInput = {}): LiquidityResult {
  const factors: LiquidityFactorResult[] = LIQUIDITY_FACTORS.map((def) => {
    const state = normalize(input[def.key]);
    const known = state !== "unknown";
    const satisfied = state === true;
    return {
      key: def.key,
      weight: def.weight,
      state,
      known,
      satisfied,
      awarded: satisfied ? def.weight : 0,
      label: def.label,
      reason: satisfied ? def.satisfiedReason : known ? def.unsatisfiedReason : def.unknownReason,
    };
  });

  const total = factors.reduce((s, f) => s + f.awarded, 0);
  const status = classifyLiquidity(total);

  return {
    total,
    status,
    statusLabel: LIQUIDITY_STATUS_FA[status],
    factors,
    missingFactors: factors.filter((f) => !f.known).map((f) => f.key),
    unmetFactors: factors.filter((f) => f.known && !f.satisfied).map((f) => f.key),
    maxScore: LIQUIDITY_MAX_SCORE,
    queue: queueFor(status),
  };
}
