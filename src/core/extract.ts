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
  return (
    toLatinDigits(text)
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/\u200c/g, " ")
      // Persian decimal separators between digits: «۱/۵» and «۱٫۵» mean 1.5.
      // Only digit/digit pairs are touched; scale words decide money meaning.
      .replace(/(\d)\s*[/٫]\s*(\d)/g, "$1.$2")
      .replace(/[,٬]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

const SCALE_MILLION_TOMAN: Record<string, number> = {
  میلیارد: 1000,
  میلیون: 1,
  هزار: 0.001,
};

const WORD_ALT = [...Object.keys(WORD_NUMBERS), "نیم"]
  .sort((a, b) => b.length - a.length)
  .join("|");
const NO_LETTER_BEFORE = "(?<![\\u0600-\\u06FF\\d.])";
const NO_LETTER_AFTER = "(?![\\u0600-\\u06FF])";
const ATOM = `(?:\\d+(?:\\.\\d+)?|(?:${WORD_ALT})${NO_LETTER_AFTER})`;
/** «۵۰۰», «۱.۵», «سیصد و پنجاه», «یک و نیم», «نیم». */
const PHRASE = `${ATOM}(?:\\s*و\\s*${ATOM})*`;
const SCALE_RE = "(میلیارد|میلیون|هزار)(?:ی)?";

/**
 * One money mention: «۱ میلیارد و ۵۰۰ میلیون», «۱/۵ میلیارد», «یک و نیم میلیارد»,
 * «نیم میلیارد», «۲ میلیارد و ۳۰۰», «۸۰۰ میلیونی», or dealer shorthand «۷۲۰ تومن».
 */
const MENTION = new RegExp(
  `${NO_LETTER_BEFORE}(${PHRASE})\\s*${SCALE_RE}(?:\\s*و\\s*(${PHRASE})(?:\\s*${SCALE_RE})?)?` +
    `|${NO_LETTER_BEFORE}(\\d{2,5})\\s*(?:تومن|تومان)(?:ی)?${NO_LETTER_AFTER}`,
  "g",
);

/** Sum of a number phrase: digits, number words and «نیم» joined by «و». */
function phraseValue(raw: string): number | undefined {
  let total = 0;
  for (const part of raw.trim().split(/\s*و\s*/)) {
    if (/^\d/.test(part)) total += parseFloat(part);
    else if (part === "نیم") total += 0.5;
    else if (WORD_NUMBERS[part] !== undefined) total += WORD_NUMBERS[part];
    else return undefined;
  }
  return Number.isFinite(total) ? total : undefined;
}

export type AmountMention = {
  index: number;
  length: number;
  /** Integer IRR. */
  value: IRR;
  /** Dealer shorthand («۷۲۰ تومن» = 720 million Toman) is less certain. */
  shorthand: boolean;
};

/** Every money mention in the text, in order, as integer IRR. Deterministic. */
export function findAmountMentions(text: string): AmountMention[] {
  const t = normalize(text);
  const mentions: AmountMention[] = [];
  for (const m of t.matchAll(MENTION)) {
    const [whole, headRaw, headScale, tailRaw, tailScale, shorthandRaw] = m;
    let millions: number | undefined;
    let length = whole.length;
    if (shorthandRaw) {
      // Market shorthand omits «million»: «۷۲۰ تومن» means 720 million Toman.
      millions = Number(shorthandRaw);
    } else {
      const head = phraseValue(headRaw);
      const unit = SCALE_MILLION_TOMAN[headScale];
      if (head === undefined || unit === undefined) continue;
      millions = head * unit;
      let tailUsed = false;
      if (tailRaw !== undefined) {
        const tail = phraseValue(tailRaw);
        if (tail !== undefined) {
          if (tailScale) {
            const tailUnit = SCALE_MILLION_TOMAN[tailScale];
            if (tailUnit !== undefined && tailUnit < unit) {
              millions += tail * tailUnit;
              tailUsed = true;
            }
          } else if (tailRaw.trim() === "نیم") {
            // «۲ میلیارد و نیم» = 2.5 billion.
            millions += 0.5 * unit;
            tailUsed = true;
          } else if (headScale === "میلیارد" && tail >= 1 && tail < 1000) {
            // «۲ میلیارد و ۳۰۰» = 2 billion and 300 million.
            millions += tail;
            tailUsed = true;
          }
        }
      }
      if (!tailUsed && tailRaw !== undefined) {
        const scaleEnd = whole.search(/(میلیارد|میلیون|هزار)(?:ی)?/);
        const head = whole.slice(scaleEnd).match(/^(میلیارد|میلیون|هزار)(?:ی)?/);
        length = scaleEnd + (head ? head[0].length : 0);
      }
    }
    // Keep a trailing currency word inside the mention so context checks see
    // «… تومان دارم» the same as «… دارم».
    const currency = t.slice(m.index! + length).match(/^\s*(?:تومان|تومن)(?![\u0600-\u06FF])/);
    if (currency && !shorthandRaw) length += currency[0].length;
    if (millions === undefined || !(millions > 0)) continue;
    const value = millionToman(millions);
    if (!Number.isSafeInteger(value)) continue;
    mentions.push({ index: m.index!, length, value, shorthand: Boolean(shorthandRaw) });
  }
  return mentions;
}

/** Extract a Toman amount from free Persian text and return integer IRR. */
export function extractAmount(text: string): IRR | undefined {
  const first = findAmountMentions(text)[0];
  if (first) return first.value;
  const bare = normalize(text).match(/(\d{6,})/);
  if (bare) return Number(bare[1]) * 10; // treated as Toman → IRR
  return undefined;
}

/**
 * Vehicle words and common Iranian-market model names. «ماشین» alone is a car,
 * but «ماشین‌آلات», «ماشین لباسشویی» and similar are equipment or goods.
 */
export const VEHICLE_WORD =
  /خودرو|ماشین(?! ?(?:آلات|لباس ?شویی|ظرف ?شویی|حساب|اداری|دوخت|چاپ|اصلاح|قهوه|تایپ))|اتومبیل|سواری|شاسی ?بلند|کراس ?اوور|هاچ ?بک|سدان|پژو|پراید|سمند|دنا|رانا|تیبا|کوییک|ساینا|شاهین|تارا|هایما|جک|چری|تیگو|آریزو|فونیکس|ام ?وی ?ام|بی ?ام ?و|بنز|تویوتا|کرولا|کمری|هیوندا|هیوندای|النترا|سوناتا|توسان|سانتافه|کیا|سراتو|اسپورتیج|سورنتو|اپتیما|لکسوس|پورشه|مزدا|رنو|ال ?90|دیگنیتی|فیدلیتی|لیفان|برلیانس|ولوو|نیسان|میتسوبیشی|لندکروز|پرادو|هیلوکس|کاپرا|وانت/;

type Rule<T> = { value: T; any: RegExp };

const PURPOSE_RULES: Rule<Purpose>[] = [
  {
    value: "business",
    any: /کسب ?و ?کار|مغازه|کارگاه|تولیدی|سرمایه در گردش|شرکت|بیزینس|توسعه کار/,
  },
  { value: "home", any: /مسکن|خانه|آپارتمان|ملک|رهن|ودیعه|اجاره/ },
  { value: "car", any: VEHICLE_WORD },
  { value: "education", any: /تحصیل|دانشگاه|دانشجو|شهریه/ },
  { value: "marriage", any: /ازدواج|عروسی|جهیزیه/ },
  { value: "debt", any: /بدهی|قسط عقب|چک برگشت|تسویه وام|تجمیع/ },
  { value: "personal", any: /شخصی|ضروری|هزینه زندگی|درمان|جراحی/ },
];

const EMPLOYMENT_RULES: Rule<Employment>[] = [
  {
    value: "business_owner",
    any: /مغازه دارم|کسب ?و ?کار دارم|جواز کسب|صاحب کار|کارگاه دارم|شرکت دارم|تولیدی دارم/,
  },
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
  // Conservatively classify explicitly labelled amounts. Ambiguous multi-amount
  // text must not silently use its first number as a loan request.
  const monetaryMentions = findAmountMentions(t);
  let classified = false;
  for (const mention of monetaryMentions) {
    const value = mention.value;
    const before = t.slice(Math.max(0, mention.index - 30), mention.index);
    const after = t.slice(mention.index + mention.length, mention.index + mention.length + 25);
    // An existing loan is a liability, not available cash or a new request.
    // Do not coerce negative amounts into positive financial facts either.
    if (/[-−]\s*$/.test(before) || (/(?:وام|تسهیلات)\s*$/.test(before) && /^\s*دارم/.test(after))) {
      classified = true;
      continue;
    }
    let key:
      | "availableCapital"
      | "spendingBudget"
      | "targetPrice"
      | "monthlyPaymentCapacity"
      | "amount"
      | undefined;
    if (/(?:توان پرداخت ماهانه|قسط ماهانه|پرداخت ماهانه|ماهی)\s*$/.test(before))
      key = "monthlyPaymentCapacity";
    else if (/^\s*(?:تومان|تومن)?\s*(?:در ماه|ماهانه|ماهیانه)/.test(after))
      key = "monthlyPaymentCapacity";
    else if (
      /(?:بودجه خرید|بودجه قابل استفاده|برای خرید کنار گذاشتم|پیش ?پرداخت)\s*$/.test(before) ||
      /^\s*(?:تومان|تومن)?\s*(?:پیش ?پرداخت|برای پیش ?پرداخت|پیش می ?دم|پیش میدم)/.test(after)
    )
      key = "spendingBudget";
    else if (
      /(?:قیمت|قیمتش|هزینه هدف|به قیمت|ارزش)\s*$/.test(before) ||
      // «ماشین ۸۰۰ میلیونی»: the adjectival «ی» prices the thing being bought.
      (/(?:میلیارد|میلیون)ی$/.test(t.slice(mention.index, mention.index + mention.length)) &&
        !/^\s*(?:دارم|نقد)/.test(after)) ||
      (VEHICLE_WORD.test(before) &&
        !/^\s*(?:تومان|تومن)?\s*(?:نقد|دارم|پول|وام|تسهیلات)/.test(after))
    )
      key = "targetPrice";
    else if (
      /^\s*(?:تومان|تومن)?\s*(?:نقد دارم|نقدی دارم|دارم|پول دارم|پول نقد دارم|سرمایه دارم|نقد|پول نقد)/.test(
        after,
      ) ||
      /(?:سرمایه موجود|پول موجود|نقد دارم|نقدی دارم)\s*$/.test(before)
    )
      key = "availableCapital";
    else if (
      /(?:وام|تسهیلات)\s*$/.test(before) ||
      /^\s*(?:تومان|تومن)?\s*(?:وام|تسهیلات|نیاز دارم|لازم دارم|کم دارم|کسری)/.test(after)
    )
      key = "amount";
    if (key) {
      slots[key] = fact(value, userStated(mention.shorthand ? 0.7 : 0.9));
      if (!filled.includes(key)) filled.push(key);
      classified = true;
    }
  }
  if (amount && !classified && monetaryMentions.length <= 1 && !/[-−]\s*\d/.test(t)) {
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
