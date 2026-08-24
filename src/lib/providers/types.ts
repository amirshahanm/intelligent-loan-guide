/**
 * Provider interfaces.
 *
 * Provider execution is server-owned. Mocks and real adapters implement the
 * same contracts, while `demo`/`simulated` truthfully describe each result.
 */

import type { IRR, Match, Partner, Product } from "@/core/types";

export interface ProductCatalogProvider {
  readonly id: string;
  readonly isMock: boolean;
  listPartners(): Promise<Partner[]>;
  listProducts(): Promise<Product[]>;
  asOf(): string;
}

export type CreditRequest = {
  anonSessionId: string;
  consentGiven: boolean;
  /** Server persistence continuity. A bare anonymous id is never authority. */
  sessionId: string;
  sessionCapability: string;
  caseId: string;
};

export type CreditSignalBand = "strong" | "moderate" | "thin" | "impaired";

export type CreditResult = {
  requestId: string;
  band: CreditSignalBand;
  signal: number;
  openFacilities: number;
  latePaymentEvents: number;
  estimatedCapacity: IRR;
  notes: string[];
  asOf: string;
  demo: boolean;
  simulated: boolean;
};

export interface CreditProvider {
  readonly id: string;
  readonly isMock: boolean;
  priceIrr(): IRR;
  check(request: CreditRequest): Promise<CreditResult>;
}

export type PaymentIntent = {
  id: string;
  amountIrr: IRR;
  status: "requires_action" | "processing" | "succeeded" | "failed";
  demo: boolean;
};

export interface PaymentProvider {
  readonly id: string;
  readonly isMock: boolean;
  createIntent(amountIrr: IRR): Promise<PaymentIntent>;
  confirm(intentId: string): Promise<PaymentIntent>;
}

/** SMS is transport only; OTP lifecycle/verification is server-owned. */
export interface SmsProvider {
  readonly id: string;
  readonly isMock: boolean;
  sendOtp(phone: string, code: string): Promise<{ sent: boolean; expiresInSeconds: number }>;
}

export type HandoffChannel = "in_app";

export type Handoff = {
  id: string;
  anonSessionId: string;
  productId: string;
  productName: string;
  partnerName: string;
  channel: HandoffChannel;
  status: "queued" | "assigned" | "in_review" | "closed";
  queuePosition: number;
  createdAt: string;
  summary: string;
  demo: boolean;
};

export interface HandoffProvider {
  readonly id: string;
  readonly isMock: boolean;
  request(input: { anonSessionId: string; match: Match; summary: string }): Promise<Handoff>;
  get(id: string): Promise<Handoff | null>;
  list(anonSessionId: string): Promise<Handoff[]>;
}

export interface UnderstandingProvider {
  readonly id: string;
  readonly isMock: boolean;
  understand(text: string): Promise<{ reply: string }>;
}
