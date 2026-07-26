/**
 * Provider interfaces.
 *
 * Phase 1 ships Mock implementations only. Swapping to production is a change
 * of factory, never a change of UX. No mock here may present itself as live
 * market, bank, credit-bureau or approval data — every result is flagged demo.
 */

import type { IRR, Match, Partner, Product } from "@/core/types";

export type DemoFlagged = { demo: true };

/* ---------------- Catalog ---------------- */

export interface ProductCatalogProvider {
  listPartners(): Promise<Partner[]>;
  listProducts(): Promise<Product[]>;
  /** Catalog freshness timestamp. */
  asOf(): string;
}

/* ---------------- Credit ---------------- */

export type CreditRequest = {
  anonSessionId: string;
  /** National ID is never stored client-side in Phase 1. */
  consentGiven: boolean;
};

export type CreditSignalBand = "strong" | "moderate" | "thin" | "impaired";

export type CreditResult = DemoFlagged & {
  requestId: string;
  band: CreditSignalBand;
  /** 0..100 normalized signal, not a bureau score. */
  signal: number;
  openFacilities: number;
  latePaymentEvents: number;
  estimatedCapacity: IRR;
  notes: string[];
  asOf: string;
  /** Always true in Phase 1: no real inquiry was performed. */
  simulated: true;
};

export interface CreditProvider {
  readonly id: string;
  readonly isMock: boolean;
  priceIrr(): IRR;
  check(request: CreditRequest): Promise<CreditResult>;
}

/* ---------------- Payment ---------------- */

export type PaymentIntent = {
  id: string;
  amountIrr: IRR;
  status: "requires_action" | "processing" | "succeeded" | "failed";
  demo: true;
};

export interface PaymentProvider {
  readonly id: string;
  readonly isMock: boolean;
  createIntent(amountIrr: IRR): Promise<PaymentIntent>;
  confirm(intentId: string): Promise<PaymentIntent>;
}

/* ---------------- Identity (phone + OTP) ---------------- */

export interface SmsProvider {
  readonly id: string;
  readonly isMock: boolean;
  sendOtp(phone: string): Promise<{ sent: boolean; expiresInSeconds: number }>;
  verifyOtp(phone: string, code: string): Promise<{ verified: boolean }>;
}

/* ---------------- Human handoff (provider-agnostic) ---------------- */

export type HandoffChannel = "in_app";

export type Handoff = {
  id: string;
  anonSessionId: string;
  productId: string;
  productName: string;
  partnerName: string;
  /** Provider-agnostic: Phase 1 only implements the in-app queue. */
  channel: HandoffChannel;
  status: "queued" | "assigned" | "in_review" | "closed";
  queuePosition: number;
  createdAt: string;
  summary: string;
  demo: true;
};

export interface HandoffProvider {
  readonly id: string;
  readonly isMock: boolean;
  request(input: { anonSessionId: string; match: Match; summary: string }): Promise<Handoff>;
  get(id: string): Promise<Handoff | null>;
  list(anonSessionId: string): Promise<Handoff[]>;
}

/* ---------------- Understanding (LLM boundary) ---------------- */

export interface UnderstandingProvider {
  readonly id: string;
  readonly isMock: boolean;
  /**
   * Extraction + explanation only. Implementations MUST NOT produce products,
   * rates, probabilities, availability or eligibility verdicts.
   */
  understand(text: string): Promise<{ reply: string }>;
}
