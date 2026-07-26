/**
 * Analytics event contract for the core funnel.
 *
 * Privacy rule: IDs, enums, coarse bands and durations only. Never raw
 * utterances, exact amounts, phone numbers or free text.
 */

import type { SlotKey } from "@/core/types";

export type AnalyticsEvent =
  | { name: "intent_started"; channel: "typed" | "voice" }
  | { name: "intent_parsed"; slotsFilled: number; slots: SlotKey[] }
  | { name: "question_asked"; questionId: string; slot: SlotKey }
  | { name: "slot_updated"; slot: SlotKey; source: "extraction" | "answer" | "edit" }
  | { name: "reasoning_started"; slotCount: number }
  | { name: "product_eliminated"; productId: string; ruleId: string }
  | { name: "match_generated"; productId: string; tier: "primary" | "near"; fitBand: FitBand }
  | { name: "recommendation_viewed"; productId: string }
  | { name: "credit_started"; simulated: true }
  | { name: "handoff_requested"; productId: string; channel: "in_app" }
  | { name: "return_session"; ageBand: "today" | "week" | "older" };

export type FitBand = "low" | "medium" | "high";

export const fitBand = (score: number): FitBand =>
  score >= 75 ? "high" : score >= 50 ? "medium" : "low";

export type TrackedEvent = AnalyticsEvent & { at: string; sessionId: string };

const buffer: TrackedEvent[] = [];
let sessionId = "anon";

export function bindAnalyticsSession(id: string) {
  sessionId = id;
}

/** Single boundary — the sink is swappable without touching callers. */
export function track(event: AnalyticsEvent) {
  const tracked: TrackedEvent = { ...event, at: new Date().toISOString(), sessionId };
  buffer.push(tracked);
  if (buffer.length > 300) buffer.shift();
  if (typeof window !== "undefined") {
    (window as unknown as { __tashilEvents?: TrackedEvent[] }).__tashilEvents = buffer;
  }
}

export const readEvents = (): TrackedEvent[] => [...buffer];
