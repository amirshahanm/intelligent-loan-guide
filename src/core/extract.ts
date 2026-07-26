/**
 * Deterministic Persian intent extraction.
 *
 * AI BOUNDARY: this is the *understanding* layer. It only extracts what the
 * user said into typed slots. It never decides eligibility, never invents a
 * product, rate, probability or availability. Voice transcripts and typed
 * text enter this exact same function — there is no separate voice pipeline.
 */

import { millionToman, toLatinDigits } from "@/lib/money";
import type {
  Collateral,
  DebtLoad,
  Employment,
  Guarantor,
  IntentSlots,
  IRR,
  Purpose,
  SlotKey,
  Urgency,
} from "./types";
import { fact, userStated } from "./types";

const WORD_NUMBERS: Record<string, number> = {
  یک: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  شیش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
  پانزده: 15,
  پونزده: 15,
  بیست: 20,
  سی: 30,
  چهل: 40,
  پنجاه: 50,
  شصت: 60,
  هفتاد: 70,
  هشتاد: 80,
  نود: 90,
  صد: 100,
  دویست: 200,
  سیصد: 300,
  چهارصد: 400,
  پانصد: 500,
  ششصد: 600,
  هفتصد: 700,
  هشتصد: 800,
  نهصد: 900,
};

function normalize(text: string): string {
  return toLatinDigits(text)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/[,٬]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract a Toman amount from free Persian text and return integer IRR. */
export function extractAmount(text: string): IRR | undefined {
  const t = normalize(text);

  const scaled = t.match(/(\d+(?:\.\d+)?)\s*(میلیارد|میلیون|هزار)/);
  if (scaled) {
    const n = parseFloat(scaled[1]);
    if (scaled[2] === "میلیارد") return millionToman(n * 1000);
    if (scaled[2] === "میلیون") return millionToman(n);
    return millionToman(n / 1000);
  }

  const wordScaled = t.match(
    /([\u0600-\u06FF]+)\s*(?:و\s*([\u0600-\u06FF]+)\s*)?(میلیارد|میلیون|هزار)/,
  );
  if (wordScaled) {
    const a = WORD_NUMBERS[wordScaled[1]];
    const b = wordScaled[2] ? WORD_NUMBERS[wordScaled[2]] : 0;
    if (a !== undefined) {
      const n = a + (b ?? 0);
      if (wordScaled[3] === "میلیارد") return millionToman(n * 1000);
      if (wordScaled[3] === "میلیون") return millionToman(n);
      return millionToman(n / 1000);
    }
  }

  const bare = t.match(/(\d{6,})/);
  if (bare) return Number(bare[1]) * 10; // treated as Toman → IRR
  return undefined;
}

type Rule<T> = { value: T; any: RegExp };

const PURPOSE_RULES: Rule<Purpose>[] = [
  { value: "business", any: /کسب ?و ?کار|مغازه|کارگاه|تولیدی|سرمایه در گردش|شرکت|بیزینس|توسعه کار/ },
  { value: "home", any: /مسکن|خانه|آپارتمان|ملک|رهن|ودیعه|اجاره/ },
  { value: "car", any: /خودرو|ماشین|پراید|لیزینگ خودرو/ },
  { value: "education", any: /تحصیل|دانشگاه|دانشجو|شهریه/ },
  { value: "marriage", any: /ازدواج|عروسی|جهیزیه/ },
  { value: "debt", any: /بدهی|قسط عقب|چک برگشت|تسویه وام|تجمیع/ },
  { value: "personal", any: /شخصی|ضروری|هزینه زندگی|درمان|جراحی/ },
];

const EMPLOYMENT_RULES: Rule<Employment>[] = [
  { value: "business_owner", any: /مغازه دارم|کسب ?و ?کار دارم|جواز کسب|صاحب کار|کارگاه دارم|شرکت دارم|تولیدی دارم/ },
  { value: "salaried", any: /کارمند|حقوق ?بگیر|فیش حقوقی|استخدام|بیمه تامین اجتماعی دارم/ },
  { value: "self_employed", any: /آزاد کار|شغل آزاد|فریلنس|خویش ?فرما|رانند/ },
  { value: "retired", any: /بازنشسته/ },
  { value: "student", any: /دانشجو|دانش ?آموز/ },
  { value: "unemployed", any: /بیکار|شغل ندارم|کار ندارم/ },
];

const COLLATERAL_RULES: Rule<Collateral>[] = [
  { value: "none", any: /وثیقه ندارم|بدون وثیقه|سند ندارم|ملک ندارم/ },
  { value: "property", any: /سند ملک|وثیقه ملکی|ملک دارم|سند شش ?دانگ|خانه دارم/ },
  { value: "vehicle", any: /سند خودرو|سند ماشین/ },
  { value: "deposit", any: /سپرده|پس ?انداز مسدود/ },
];

const GUARANTOR_RULES: Rule<Guarantor>[] = [
  { value: "none", any: /ضامن ندارم|بدون ضامن|کسی ضامنم نمیشه|ضامن پیدا نمیکنم/ },
  { value: "payroll", any: /ضامن کارمند|ضامن رسمی|ضامن با فیش/ },
  { value: "business", any: /ضامن کاسب|ضامن جواز/ },
];

const DEBT_RULES: Rule<DebtLoad>[] = [
  { value: "heavy", any: /چک برگشت|قسط عقب ?افتاده|بدهی زیاد|وام سنگین|بلک ?لیست/ },
  { value: "light", any: /یه وام دارم|یک وام دارم|قسط دارم|بدهی کم/ },
  { value: "none", any: /بدهی ندارم|وام ندارم|قسط ندارم/ },
];

const URGENCY_RULES: Rule<Urgency>[] = [
  { value: "immediate", any: /فوری|سریع|همین الان|زود|اورژانس/ },
  { value: "weeks", any: /چند هفته|این ماه|تا آخر ماه/ },
  { value: "flexible", any: /عجله ندارم|فرصت دارم|زمان دارم/ },
];

const PROVINCES = [
  "تهران",
  "اصفهان",
  "مشهد",
  "شیراز",
  "تبریز",
  "کرج",
  "اهواز",
  "قم",
  "رشت",
  "کرمان",
  "یزد",
  "ارومیه",
];

function matchRules<T>(t: string, rules: Rule<T>[]): T | undefined {
  for (const r of rules) if (r.any.test(t)) return r.value;
  return undefined;
}

export type ExtractionResult = {
  slots: IntentSlots;
  filled: SlotKey[];
  /** true when the user says they have a guarantor but not which kind. */
  guarantorTypeUnclear: boolean;
};

export function extractSlots(text: string): ExtractionResult {
  const t = normalize(text);
  const slots: IntentSlots = {};
  const filled: SlotKey[] = [];

  const amount = extractAmount(t);
  if (amount) {
    slots.amount = fact(amount, userStated(0.9));
    filled.push("amount");
  }

  const purpose = matchRules(t, PURPOSE_RULES);
  if (purpose) {
    slots.purpose = fact(purpose, userStated(0.85));
    filled.push("purpose");
  }

  const employment = matchRules(t, EMPLOYMENT_RULES);
  if (employment) {
    slots.employment = fact(employment, userStated(0.85));
    filled.push("employment");
  }

  const collateral = matchRules(t, COLLATERAL_RULES);
  if (collateral) {
    slots.collateral = fact(collateral, userStated(0.85));
    filled.push("collateral");
  }

  const guarantor = matchRules(t, GUARANTOR_RULES);
  if (guarantor) {
    slots.guarantor = fact(guarantor, userStated(0.9));
    filled.push("guarantor");
  }

  const debtLoad = matchRules(t, DEBT_RULES);
  if (debtLoad) {
    slots.debtLoad = fact(debtLoad, userStated(0.75));
    filled.push("debtLoad");
  }

  const urgency = matchRules(t, URGENCY_RULES);
  if (urgency) {
    slots.urgency = fact(urgency, userStated(0.8));
    filled.push("urgency");
  }

  const province = PROVINCES.find((p) => t.includes(p));
  if (province) {
    slots.region = fact(province, userStated(0.8));
    filled.push("region");
  }

  const guarantorTypeUnclear = !guarantor && /ضامن دارم|ضامن هست/.test(t);

  return { slots, filled, guarantorTypeUnclear };
}

/** Merge newly extracted slots over existing ones (newer wins). */
export function mergeSlots(base: IntentSlots, incoming: IntentSlots): IntentSlots {
  return { ...base, ...incoming };
}
