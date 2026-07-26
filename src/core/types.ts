/**
 * TashilRadar — core domain types.
 *
 * Rules enforced by this module:
 *  - All monetary values are integer IRR (Rials). Never Toman, never strings.
 *  - Every fact carries provenance. Mock/demo facts are flagged `demo: true`.
 *  - This module is pure and isomorphic: no React, no DOM, no network.
 */

export type IRR = number;

/* ------------------------------------------------------------------ */
/* Provenance                                                          */
/* ------------------------------------------------------------------ */

export type ProvenanceSource =
  | "user_stated"
  | "user_confirmed"
  | "provider_verified"
  | "catalog"
  | "derived";

export type Provenance = {
  source: ProvenanceSource;
  /** 0..1 */
  confidence: number;
  /** ISO timestamp of when the fact was established. */
  asOf: string;
  /** True whenever the fact originates from a Phase 1 mock provider. */
  demo?: true;
};

export type Fact<T> = {
  value: T;
  provenance: Provenance;
};

export function fact<T>(value: T, provenance: Provenance): Fact<T> {
  return { value, provenance };
}

export function userStated(confidence = 0.8): Provenance {
  return { source: "user_stated", confidence, asOf: new Date().toISOString() };
}

export function userConfirmed(): Provenance {
  return { source: "user_confirmed", confidence: 1, asOf: new Date().toISOString() };
}

export function derived(confidence = 1): Provenance {
  return { source: "derived", confidence, asOf: new Date().toISOString() };
}

export function catalogFact(asOf: string): Provenance {
  return { source: "catalog", confidence: 1, asOf, demo: true };
}

export function providerVerified(confidence = 1): Provenance {
  return {
    source: "provider_verified",
    confidence,
    asOf: new Date().toISOString(),
    demo: true,
  };
}

/* ------------------------------------------------------------------ */
/* Intent slots                                                        */
/* ------------------------------------------------------------------ */

export type Purpose =
  | "business"
  | "home"
  | "car"
  | "personal"
  | "education"
  | "debt"
  | "marriage"
  | "unknown";

export type Employment =
  | "salaried"
  | "self_employed"
  | "business_owner"
  | "retired"
  | "student"
  | "unemployed"
  | "unknown";

export type Collateral = "property" | "vehicle" | "deposit" | "none" | "unknown";
export type Guarantor = "payroll" | "business" | "none" | "unknown";
export type Urgency = "immediate" | "weeks" | "flexible" | "unknown";
export type IncomeBand = "under_20" | "20_50" | "50_100" | "over_100" | "unknown";
export type DebtLoad = "none" | "light" | "heavy" | "unknown";

export type SlotKey =
  | "amount"
  | "purpose"
  | "employment"
  | "collateral"
  | "guarantor"
  | "incomeBand"
  | "debtLoad"
  | "urgency"
  | "region";

export type IntentSlots = {
  /** Requested amount, integer IRR. */
  amount?: Fact<IRR>;
  purpose?: Fact<Purpose>;
  employment?: Fact<Employment>;
  collateral?: Fact<Collateral>;
  guarantor?: Fact<Guarantor>;
  incomeBand?: Fact<IncomeBand>;
  debtLoad?: Fact<DebtLoad>;
  urgency?: Fact<Urgency>;
  region?: Fact<string>;
};

/** Free-form intent as captured from voice or typing (identical pipeline). */
export type CapturedIntent = {
  id: string;
  text: string;
  channel: "typed" | "voice";
  at: string;
};

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export type Partner = {
  id: string;
  /** Neutral demo identity. Never a real institution name in Phase 1. */
  name: string;
  kind: "bank" | "credit_institution" | "fund" | "leasing" | "fintech";
  demo: true;
};

export type ProductRules = {
  minAmount: IRR;
  maxAmount: IRR;
  allowedEmployment: Employment[];
  requiresCollateral: Collateral[] | null;
  requiresGuarantor: Guarantor[] | null;
  minIncomeBand: IncomeBand;
  maxDebtLoad: DebtLoad;
  allowedPurposes: Purpose[];
};

export type Product = {
  id: string;
  partnerId: string;
  name: string;
  /** Annual profit rate, percent. Catalog fact, demo data. */
  ratePercent: number;
  maxTermMonths: number;
  /** Typical time to funds, days. */
  typicalDays: number;
  /** Catalog freshness. */
  asOf: string;
  rules: ProductRules;
  notes: string;
};

/* ------------------------------------------------------------------ */
/* Reasoning trace                                                     */
/* ------------------------------------------------------------------ */

export type ReadinessDimension =
  | "identity"
  | "income"
  | "collateral"
  | "guarantor"
  | "credit_signal"
  | "debt_load";

export type ReadinessScore = {
  dimension: ReadinessDimension;
  /** 0..100 */
  score: number;
  label: string;
  blocker?: string;
};

export type Readiness = {
  total: number;
  dimensions: ReadinessScore[];
  blockers: string[];
};

export type EliminationReason = {
  ruleId: string;
  message: string;
  /** Which slot(s) caused it — powers provenance display. */
  slots: SlotKey[];
};

export type EliminatedPath = {
  productId: string;
  productName: string;
  partnerName: string;
  reasons: EliminationReason[];
};

export type NextAction = {
  id: string;
  label: string;
  detail: string;
  /** Which slot filling / step unlocks value. */
  unlocks?: string;
  kind: "slot" | "document" | "credit" | "handoff" | "adjust";
};

export type MatchGap = {
  ruleId: string;
  message: string;
  /** How far off, 0..1 (0 = met). */
  distance: number;
};

export type Match = {
  productId: string;
  productName: string;
  partnerId: string;
  partnerName: string;
  /** 0..100 */
  fitScore: number;
  tier: "primary" | "near";
  ratePercent: number;
  maxTermMonths: number;
  typicalDays: number;
  /** Max amount the engine believes is reachable, IRR. */
  reachableAmount: IRR;
  matchedBecause: string[];
  gaps: MatchGap[];
  nextActions: NextAction[];
  asOf: string;
  demo: true;
};

export type ReasoningStep = {
  phase: "scan" | "detect" | "connect" | "resolve";
  productId: string;
  productName: string;
  partnerName: string;
  outcome: "evaluating" | "eliminated" | "near" | "primary";
  note: string;
};

export type ReasoningTrace = {
  runId: string;
  at: string;
  computedBy: "client-preview" | "server-authoritative";
  slotsUsed: SlotKey[];
  evaluatedCount: number;
  steps: ReasoningStep[];
  readiness: Readiness;
  eliminated: EliminatedPath[];
  matches: Match[];
  nextActions: NextAction[];
};
