/**
 * TashilRadar — Lead Liquidity Engine V0.
 *
 * Pure, deterministic, isomorphic domain layer. No React, no DOM, no network,
 * no randomness, no time-dependent scoring. Not wired to any UI yet.
 *
 * What this score measures: EXECUTION / READINESS CLARITY — how workable the
 * lead is for the desk right now. It is NOT an eligibility or credit-quality
 * score; eligibility lives in the readiness/match engine.
 *
 * Two factor kinds, deliberately typed differently so one boolean is never
 * overloaded with two meanings:
 *  - `clarity` factors score when the fact is KNOWN, whatever its value.
 *    A reviewed-but-blocked credit report, or a confirmed "no guarantee",
 *    still earns full points: the desk knows where it stands.
 *  - `condition` factors score only when the positive condition holds
 *    (flexible route, documents ready, responsive, decision-maker, cost-ready).
 *
 * Contract rules:
 *  - This engine NEVER rejects or deletes a lead. It only classifies it and
 *    recommends a queue priority.
 *  - Unknown/missing is an explicit state (`undefined` or `"unknown"`), never
 *    silently coerced into a negative fact. Unknown awards 0 points and is
 *    surfaced through `missingFactors`.
 *  - Inputs are an explicit contract for the future pre-qualification / CRM
 *    layer. Liquidity facts are NEVER derived from unrelated IntentSlots
 *    (urgency is not a deadline, income band is not installment capacity).
 */

/* ------------------------------------------------------------------ */
/* Input contract                                                      */
/* ------------------------------------------------------------------ */

/** Clarity factors: the fact is either established or not yet established. */
export type ClarityState = "known" | "unknown";

/** Condition factors: the positive condition holds, does not hold, or is unstated. */
export type ConditionState = true | false | "unknown";

/** Credit review is a clarity factor with domain-specific wording. */
export type ReviewState = "reviewed" | "unknown";

export type ClarityFactorKey =
  | "exact_amount"
  | "deadline"
  | "installment_capacity"
  | "credit_status_reviewed"
  | "guarantee_situation";

export type ConditionFactorKey =
  | "route_flexibility"
  | "initial_documents"
  | "responsiveness"
  | "decision_maker"
  | "cost_readiness";

export type LiquidityFactorKey = ClarityFactorKey | ConditionFactorKey;

/**
 * Explicit liquidity input. Every field is optional; an omitted field is
 * treated exactly like `"unknown"` — missing, not negative.
 */
export type LiquidityInput = {
  /** Exact requested amount established (value itself lives in the CRM record). */
  exact_amount?: ClarityState;
  /** A concrete deadline is established. */
  deadline?: ClarityState;
  /** Installment capacity is established — even if the capacity is low. */
  installment_capacity?: ClarityState;
  /** Credit / cheque / arrears status has been reviewed — clean or blocked. */
  credit_status_reviewed?: ReviewState;
  /** Guarantee / guarantor / collateral situation is established — including "none". */
  guarantee_situation?: ClarityState;
  /** Route or bank flexibility exists. */
  route_flexibility?: ConditionState;
  /** Initial documents are ready. */
  initial_documents?: ConditionState;
  /** Lead is actively responsive. */
  responsiveness?: ConditionState;
  /** Lead is the actual decision-maker. */
  decision_maker?: ConditionState;
  /** Lead is financially ready for lawful / execution costs. */
  cost_readiness?: ConditionState;
};

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
  kind: "clarity" | "condition";
  weight: number;
  /** Normalized input state as received. */
  state: ClarityState | ReviewState | ConditionState;
  /** True when the fact has been established at all. */
  known: boolean;
  /** True when the factor earns its points. */
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
  /** Factors whose fact is not yet established. Never a rejection signal. */
  missingFactors: LiquidityFactorKey[];
  /** Condition factors explicitly answered "no". Clarity factors never appear here. */
  unmetFactors: ConditionFactorKey[];
  maxScore: number;
  queue: LiquidityQueue;
};

/* ------------------------------------------------------------------ */
/* Weights & labels                                                    */
/* ------------------------------------------------------------------ */

type ClarityDef = {
  key: ClarityFactorKey;
  kind: "clarity";
  weight: number;
  label: string;
  knownReason: string;
  unknownReason: string;
};

type ConditionDef = {
  key: ConditionFactorKey;
  kind: "condition";
  weight: number;
  label: string;
  satisfiedReason: string;
  unsatisfiedReason: string;
  unknownReason: string;
};

export type LiquidityFactorDef = ClarityDef | ConditionDef;

export const LIQUIDITY_FACTORS: readonly LiquidityFactorDef[] = [
  {
    key: "exact_amount",
    kind: "clarity",
    weight: 10,
    label: "مبلغ دقیق درخواستی",
    knownReason: "مبلغ دقیق موردنیاز مشخص شده است.",
    unknownReason: "مبلغ دقیق موردنیاز هنوز مشخص نشده است.",
  },
  {
    key: "deadline",
    kind: "clarity",
    weight: 10,
    label: "مهلت زمانی",
    knownReason: "مهلت زمانی مشخص شده است.",
    unknownReason: "مهلت زمانی هنوز مشخص نشده است.",
  },
  {
    key: "installment_capacity",
    kind: "clarity",
    weight: 10,
    label: "توان پرداخت قسط",
    knownReason: "توان پرداخت قسط ماهانه مشخص شده است (هر مقدار).",
    unknownReason: "توان پرداخت قسط ماهانه هنوز مشخص نشده است.",
  },
  {
    key: "credit_status_reviewed",
    kind: "clarity",
    weight: 15,
    label: "بررسی وضعیت اعتباری، چک و معوقات",
    knownReason: "وضعیت اعتباری، چک و معوقات بررسی شده است (فارغ از نتیجه).",
    unknownReason: "وضعیت اعتباری، چک و معوقات هنوز بررسی نشده است.",
  },
  {
    key: "guarantee_situation",
    kind: "clarity",
    weight: 15,
    label: "وضعیت تضامین",
    knownReason: "وضعیت ضامن یا وثیقه روشن است (حتی اگر «ندارد» باشد).",
    unknownReason: "وضعیت ضامن یا وثیقه هنوز روشن نشده است.",
  },
  {
    key: "route_flexibility",
    kind: "condition",
    weight: 10,
    label: "انعطاف در مسیر یا بانک",
    satisfiedReason: "امکان انتخاب مسیر یا بانک جایگزین وجود دارد.",
    unsatisfiedReason: "کاربر روی یک مسیر یا بانک خاص محدود است.",
    unknownReason: "میزان انعطاف مسیر یا بانک مشخص نیست.",
  },
  {
    key: "initial_documents",
    kind: "condition",
    weight: 10,
    label: "آمادگی مدارک اولیه",
    satisfiedReason: "مدارک اولیه آماده است.",
    unsatisfiedReason: "مدارک اولیه هنوز آماده نیست.",
    unknownReason: "وضعیت مدارک اولیه مشخص نشده است.",
  },
  {
    key: "responsiveness",
    kind: "condition",
    weight: 5,
    label: "پاسخ‌گویی فعال",
    satisfiedReason: "کاربر به‌صورت فعال پاسخ‌گو است.",
    unsatisfiedReason: "کاربر در تماس‌ها پاسخ‌گو نبوده است.",
    unknownReason: "میزان پاسخ‌گویی هنوز سنجیده نشده است.",
  },
  {
    key: "decision_maker",
    kind: "condition",
    weight: 5,
    label: "تصمیم‌گیرنده بودن",
    satisfiedReason: "کاربر تصمیم‌گیرندهٔ واقعی پرونده است.",
    unsatisfiedReason: "تصمیم نهایی با شخص دیگری است.",
    unknownReason: "مشخص نیست تصمیم‌گیرندهٔ نهایی چه کسی است.",
  },
  {
    key: "cost_readiness",
    kind: "condition",
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
    recommendation: "نیازمند روشن‌شدن فاکتورهای کلیدی پیش از اقدام است.",
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

function evaluateFactor(def: LiquidityFactorDef, input: LiquidityInput): LiquidityFactorResult {
  if (def.kind === "clarity") {
    const raw = input[def.key];
    const established = raw === "known" || raw === "reviewed";
    const state: ClarityState | ReviewState = established
      ? def.key === "credit_status_reviewed"
        ? "reviewed"
        : "known"
      : "unknown";
    return {
      key: def.key,
      kind: "clarity",
      weight: def.weight,
      state,
      known: established,
      satisfied: established,
      awarded: established ? def.weight : 0,
      label: def.label,
      reason: established ? def.knownReason : def.unknownReason,
    };
  }

  const raw = input[def.key];
  const state: ConditionState = raw === true || raw === false ? raw : "unknown";
  const known = state !== "unknown";
  const satisfied = state === true;
  return {
    key: def.key,
    kind: "condition",
    weight: def.weight,
    state,
    known,
    satisfied,
    awarded: satisfied ? def.weight : 0,
    label: def.label,
    reason: satisfied ? def.satisfiedReason : known ? def.unsatisfiedReason : def.unknownReason,
  };
}

export function scoreLeadLiquidity(input: LiquidityInput = {}): LiquidityResult {
  const factors = LIQUIDITY_FACTORS.map((def) => evaluateFactor(def, input));

  const total = factors.reduce((s, f) => s + f.awarded, 0);
  const status = classifyLiquidity(total);

  return {
    total,
    status,
    statusLabel: LIQUIDITY_STATUS_FA[status],
    factors,
    missingFactors: factors.filter((f) => !f.known).map((f) => f.key),
    unmetFactors: factors
      .filter((f) => f.kind === "condition" && f.known && !f.satisfied)
      .map((f) => f.key as ConditionFactorKey),
    maxScore: LIQUIDITY_MAX_SCORE,
    queue: queueFor(status),
  };
}
