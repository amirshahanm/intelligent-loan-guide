/**
 * Adaptive question catalog.
 *
 * The engine — not the language model — decides what to ask next. Questions
 * are ranked by how much they unblock reasoning, so the user is never asked
 * more than a few things.
 */

import type { IntentSlots, SlotKey } from "./types";
import {
  ADVERSE_FA,
  COLLATERAL_FA,
  DEBT_FA,
  EMPLOYMENT_FA,
  GUARANTOR_FA,
  INCOME_FA,
  PURPOSE_FA,
  TURNOVER_FA,
  URGENCY_FA,
} from "./labels";

export type QuestionOption = { value: string; label: string };

export type Question = {
  id: string;
  slot: SlotKey;
  text: string;
  helper?: string;
  kind: "options" | "amount";
  options?: QuestionOption[];
  /** Higher = asked earlier. */
  weight: number;
};

const opts = <T extends string>(map: Record<T, string>, exclude: T[] = []): QuestionOption[] =>
  (Object.keys(map) as T[])
    .filter((k) => k !== ("unknown" as T) && !exclude.includes(k))
    .map((k) => ({ value: k, label: map[k] }));

export const QUESTIONS: Question[] = [
  {
    id: "q_amount",
    slot: "amount",
    text: "چه مبلغی نیاز داری؟",
    helper: "مبلغ تقریبی کافی است؛ بعداً می‌توانی تغییرش بدهی.",
    kind: "amount",
    weight: 100,
  },
  {
    id: "q_employment",
    slot: "employment",
    text: "وضعیت شغلی‌ات کدام است؟",
    helper: "این مهم‌ترین عاملی است که مسیرها را باز یا بسته می‌کند.",
    kind: "options",
    options: opts(EMPLOYMENT_FA),
    weight: 95,
  },
  {
    id: "q_guarantor",
    slot: "guarantor",
    text: "ضامن در دسترس داری؟",
    kind: "options",
    options: opts(GUARANTOR_FA),
    weight: 85,
  },
  {
    id: "q_collateral",
    slot: "collateral",
    text: "وثیقه‌ای می‌توانی بگذاری؟",
    kind: "options",
    options: opts(COLLATERAL_FA),
    weight: 80,
  },
  {
    id: "q_income",
    slot: "incomeBand",
    text: "درآمد ماهانه‌ات تقریباً چقدر است؟",
    helper: "بازهٔ تقریبی کافی است.",
    kind: "options",
    options: opts(INCOME_FA),
    weight: 70,
  },
  {
    id: "q_debt",
    slot: "debtLoad",
    text: "مجموع اقساط و بدهی ماهانه‌ات تقریباً چقدر است؟",
    kind: "options",
    options: opts(DEBT_FA),
    weight: 68,
  },
  {
    id: "q_turnover",
    slot: "bankTurnover",
    text: "میانگین گردش حساب ماهانه‌ات چقدر است؟",
    kind: "options",
    options: opts(TURNOVER_FA),
    weight: 66,
  },
  {
    id: "q_adverse",
    slot: "adverseHistory",
    text: "سابقه چک برگشتی یا بدهی معوق داری؟",
    kind: "options",
    options: opts(ADVERSE_FA),
    weight: 64,
  },
  {
    id: "q_purpose",
    slot: "purpose",
    text: "این مبلغ را برای چه می‌خواهی؟",
    kind: "options",
    options: opts(PURPOSE_FA),
    weight: 65,
  },
  {
    id: "q_urgency",
    slot: "urgency",
    text: "چقدر عجله داری؟",
    kind: "options",
    options: opts(URGENCY_FA),
    weight: 40,
  },
];

/** Next unanswered question, ranked by unblocking weight. Null when ready. */
export function nextQuestion(slots: IntentSlots, asked: string[]): Question | null {
  if (isAssessmentComplete(slots)) return null;
  const candidates = QUESTIONS.filter(
    (q) => slots[q.slot] === undefined && !asked.includes(q.id),
  ).sort((a, b) => b.weight - a.weight);
  return candidates[0] ?? null;
}

/** The full assessment sequence. The result section stays hidden until all are answered. */
export const ASSESSMENT_SLOTS: SlotKey[] = [
  "amount",
  "employment",
  "guarantor",
  "collateral",
  "incomeBand",
  "debtLoad",
  "bankTurnover",
  "adverseHistory",
];

export function isAssessmentComplete(slots: IntentSlots): boolean {
  return ASSESSMENT_SLOTS.every((s) => slots[s] !== undefined);
}

/** Slots required before the engine result is considered decision-grade. */
export const CORE_SLOTS: SlotKey[] = ["amount", "employment", "guarantor", "collateral"];

export function hasCoreSlots(slots: IntentSlots): boolean {
  return CORE_SLOTS.every((s) => slots[s] !== undefined);
}
