import type { IntentSlots } from "./types";
import {
  universalNeedFromLegacySlots,
  type NeedKind,
  type UniversalNeed,
} from "./opportunity-routes";

function normalize(text: string): string {
  return text
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type NeedRule = {
  kind: NeedKind;
  confidence: number;
  pattern: RegExp;
};

const RULES: NeedRule[] = [
  {
    kind: "trade_import",
    confidence: 0.96,
    pattern: /واردات|وارد کنم|وارد کردن|خرید خارجی|تامین از خارج|تأمین از خارج|ثبت سفارش/,
  },
  {
    kind: "trade_export",
    confidence: 0.96,
    pattern: /صادرات|صادر کنم|صادر کردن|فروش خارجی|بازار صادراتی/,
  },
  {
    kind: "purchase_vehicle",
    confidence: 0.95,
    pattern: /خرید (?:یک )?(?:خودرو|ماشین)|ماشین بخر|خودرو بخر|خودرو اقساط|ماشین اقساط|لیزینگ خودرو/,
  },
  {
    kind: "purchase_property",
    confidence: 0.94,
    pattern: /خرید (?:خانه|آپارتمان|ملک)|خانه بخر|ملک بخر|آپارتمان بخر/,
  },
  {
    kind: "equipment",
    confidence: 0.94,
    pattern:
      /تجهیزات|دستگاه (?:پزشکی|زیبایی|صنعتی|تولیدی)|ماشین ?آلات|تجهیز مطب|تجهیز کلینیک|تجهیز کارگاه/,
  },
  {
    kind: "working_capital",
    confidence: 0.92,
    pattern:
      /سرمایه در گردش|نقدینگی کسب ?و ?کار|پول برای مغازه|پول برای کارگاه|سرمایه برای شرکت|توسعه کسب ?و ?کار|توسعه کار/,
  },
  {
    kind: "purchase_goods",
    confidence: 0.88,
    pattern:
      /خرید اقساطی|قسطی بخر|اعتباری بخر|خرید کالا|گوشی بخر|موبایل بخر|لپ ?تاپ بخر|لوازم خانگی/,
  },
  {
    kind: "cash",
    confidence: 0.86,
    pattern: /وام|پول لازم|نقدینگی لازم|پول می ?خوام|تسهیلات|اعتبار نقدی/,
  },
];

export function universalNeedFromText(
  text: string | null | undefined,
  slots: IntentSlots,
): UniversalNeed {
  const normalized = normalize(text ?? "");
  const targetAmount = slots.amount?.value;

  for (const rule of RULES) {
    if (rule.pattern.test(normalized)) {
      return {
        kind: rule.kind,
        targetAmount,
        source: "ai_structured",
        confidence: rule.confidence,
      };
    }
  }

  return universalNeedFromLegacySlots(slots);
}
