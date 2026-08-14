import type { IntentSlots } from "./types";
import {
  LIQUIDITY_FACTORS,
  scoreLeadLiquidity,
  type ConditionFactorKey,
  type LiquidityFactorKey,
  type LiquidityInput,
  type LiquidityResult,
} from "./liquidity";

export type LiquidityAnswer = "known" | "reviewed" | true | false;

/**
 * Trusted integration boundary for a future production credit provider.
 * Demo results, UI completion, scores, and estimated capacity cannot satisfy
 * this contract. The provider adapter must explicitly attest to a real review.
 */
export type VerifiedCreditReview = {
  reviewed: true;
  source: "verified_provider";
  asOf: string;
};

export type LiquidityQuestion = {
  key: LiquidityFactorKey;
  text: string;
  helper: string;
  options: { label: string; value: LiquidityAnswer }[];
};

const QUESTIONS: Record<LiquidityFactorKey, Omit<LiquidityQuestion, "key">> = {
  exact_amount: {
    text: "مبلغ دقیق موردنیازت مشخص است؟",
    helper: "مبلغ تقریبی کافی نیست؛ فقط اگر عدد نهایی را مشخص کرده‌ای تأیید کن.",
    options: [{ label: "بله، دقیق است", value: "known" }],
  },
  deadline: {
    text: "مهلت مشخصی برای دریافت منابع داری؟",
    helper: "در این مرحله تاریخ یا توضیح شخصی لازم نیست؛ فقط روشن‌بودن مهلت مهم است.",
    options: [{ label: "بله، مشخص است", value: "known" }],
  },
  installment_capacity: {
    text: "توان پرداخت قسط ماهانه‌ات را مشخص کرده‌ای؟",
    helper: "کم یا زیاد بودن آن اینجا امتیاز منفی نیست؛ روشن‌بودنش مهم است.",
    options: [{ label: "بله، مشخص است", value: "known" }],
  },
  credit_status_reviewed: {
    text: "وضعیت اعتبار، چک و معوقاتت بررسی شده؟",
    helper: "نتیجهٔ بررسی در این امتیاز دخالت ندارد.",
    options: [{ label: "بله، بررسی شده", value: "reviewed" }],
  },
  guarantee_situation: {
    text: "وضعیت ضامن یا وثیقه‌ات روشن است؟",
    helper: "نداشتن ضامن یا وثیقه هم یک پاسخ روشن است، نه پاسخ منفی.",
    options: [{ label: "بله، روشن است", value: "known" }],
  },
  route_flexibility: {
    text: "برای انتخاب مسیر یا مؤسسهٔ جایگزین انعطاف داری؟",
    helper: "این پاسخ فقط آمادگی اجرا را می‌سنجد و مسیرهای تطبیق را حذف نمی‌کند.",
    options: [
      { label: "بله", value: true },
      { label: "فعلاً نه", value: false },
    ],
  },
  initial_documents: {
    text: "مدارک اولیه‌ات آماده است؟",
    helper: "مثل مدارک هویتی و شغلی؛ هیچ مدرکی اینجا بارگذاری نمی‌شود.",
    options: [
      { label: "بله", value: true },
      { label: "هنوز نه", value: false },
    ],
  },
  responsiveness: {
    text: "برای ادامهٔ پیگیری در دسترس و پاسخ‌گو هستی؟",
    helper: "این پاسخ فقط برای ترتیب اقدام است.",
    options: [
      { label: "بله", value: true },
      { label: "فعلاً نه", value: false },
    ],
  },
  decision_maker: {
    text: "تصمیم نهایی این درخواست با خودت است؟",
    helper: "اگر شخص دیگری تصمیم می‌گیرد، پرونده همچنان حفظ می‌شود.",
    options: [
      { label: "بله", value: true },
      { label: "خیر", value: false },
    ],
  },
  cost_readiness: {
    text: "برای هزینه‌های قانونی و اجرایی احتمالی آمادگی داری؟",
    helper: "این به معنی وجود هزینه یا تأیید وام نیست؛ فقط آمادگی را می‌سنجد.",
    options: [
      { label: "بله", value: true },
      { label: "فعلاً نه", value: false },
    ],
  },
};

/** Reuses only facts with identical semantics; never infers liquidity from mere slot presence. */
export function knownLiquidityFacts(
  slots: IntentSlots,
  creditReview?: VerifiedCreditReview,
): LiquidityInput {
  const guarantor = slots.guarantor?.value;
  const collateral = slots.collateral?.value;
  const guaranteeSituationComplete =
    guarantor !== undefined &&
    guarantor !== "unknown" &&
    collateral !== undefined &&
    collateral !== "unknown";

  return {
    // IntentSlots has no explicit "amount is exact" evidence. Presence alone is insufficient.
    ...(guaranteeSituationComplete ? { guarantee_situation: "known" as const } : {}),
    ...(creditReview?.reviewed === true && creditReview.source === "verified_provider"
      ? { credit_status_reviewed: "reviewed" as const }
      : {}),
  };
}

export function nextLiquidityQuestion(
  input: LiquidityInput,
  skipped: readonly LiquidityFactorKey[] = [],
): LiquidityQuestion | null {
  const missing = scoreLeadLiquidity(input).missingFactors.find((key) => !skipped.includes(key));
  return missing ? { key: missing, ...QUESTIONS[missing] } : null;
}

export type LiquidityNextAction = {
  key: LiquidityFactorKey | "ready";
  label: string;
  detail: string;
};

export function liquidityNextAction(
  result: LiquidityResult,
  skipped: readonly LiquidityFactorKey[] = [],
): LiquidityNextAction {
  const missing = result.missingFactors.find((key) => !skipped.includes(key));
  if (missing)
    return {
      key: missing,
      label: `روشن‌کردن «${LIQUIDITY_FACTORS.find((f) => f.key === missing)!.label}»`,
      detail: "این پرسش، نزدیک‌ترین گام برای شفاف‌ترشدن آمادگی اجراست.",
    };
  const unmet = result.unmetFactors[0] as ConditionFactorKey | undefined;
  if (unmet)
    return {
      key: unmet,
      label: `بهبود «${LIQUIDITY_FACTORS.find((f) => f.key === unmet)!.label}»`,
      detail: "پاسخ فعلی مانع یا رد نیست؛ هر زمان شرایط عوض شد می‌توانی آن را به‌روز کنی.",
    };
  return {
    key: "ready",
    label: "آمادهٔ انتخاب اقدام بعدی",
    detail: "فاکتورهای آمادگی اجرا روشن‌اند؛ این نتیجه تضمین تأیید یا پیشنهاد مالی نیست.",
  };
}
