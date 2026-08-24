/**
 * Phase 1 mock providers.
 *
 * Deterministic (seeded by session id), realistic latency, and always
 * flagged `demo: true` / `simulated: true`. No real inquiry is ever performed.
 */

import { PARTNERS, PRODUCTS } from "@/core/catalog";
import { millionToman } from "@/lib/money";
import type { IRR, Match } from "@/core/types";
import type {
  CreditProvider,
  CreditRequest,
  CreditResult,
  Handoff,
  HandoffProvider,
  PaymentIntent,
  PaymentProvider,
  ProductCatalogProvider,
  SmsProvider,
} from "./types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function seedFrom(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/* ---------------- Catalog ---------------- */

export const mockCatalogProvider: ProductCatalogProvider = {
  id: "mock_catalog",
  isMock: true,
  async listPartners() {
    await delay(60);
    return PARTNERS;
  },
  async listProducts() {
    await delay(80);
    return PRODUCTS;
  },
  asOf: () => PRODUCTS[0].asOf,
};

/* ---------------- Credit ---------------- */

export const mockCreditProvider: CreditProvider = {
  id: "mock_credit",
  isMock: true,
  priceIrr: () => millionToman(0.089), // demo placeholder price
  async check(request: CreditRequest): Promise<CreditResult> {
    if (!request.consentGiven) throw new Error("consent_required");
    await delay(1400);
    const seed = seedFrom(request.anonSessionId);
    const signal = 42 + (seed % 51);
    const band: CreditResult["band"] =
      signal >= 80 ? "strong" : signal >= 62 ? "moderate" : signal >= 50 ? "thin" : "impaired";
    return {
      requestId: `cr_${seed.toString(36)}`,
      band,
      signal,
      openFacilities: seed % 4,
      latePaymentEvents: band === "impaired" ? 2 + (seed % 3) : seed % 2,
      estimatedCapacity: millionToman(80 + (seed % 12) * 40),
      notes: [],
      asOf: new Date().toISOString(),
      demo: true,
      simulated: true,
    };
  },
};

/* ---------------- Payment ---------------- */

const intents = new Map<string, PaymentIntent>();

export const mockPaymentProvider: PaymentProvider = {
  id: "mock_payment",
  isMock: true,
  async createIntent(amountIrr: IRR) {
    await delay(300);
    const intent: PaymentIntent = {
      id: `pi_${Date.now().toString(36)}`,
      amountIrr,
      status: "requires_action",
      demo: true,
    };
    intents.set(intent.id, intent);
    return intent;
  },
  async confirm(intentId: string) {
    await delay(700);
    const existing = intents.get(intentId);
    const next: PaymentIntent = {
      id: intentId,
      amountIrr: existing?.amountIrr ?? 0,
      status: "succeeded",
      demo: true,
    };
    intents.set(intentId, next);
    return next;
  },
};

/* ---------------- SMS / OTP ---------------- */

export const mockSmsProvider: SmsProvider = {
  id: "mock_sms",
  isMock: true,
  async sendOtp() {
    await delay(400);
    return { sent: true, expiresInSeconds: 120 };
  },
  async verifyOtp(_phone: string, code: string) {
    await delay(400);
    return { verified: code.length === 5 };
  },
};

/* ---------------- Handoff (provider-agnostic queue) ---------------- */

const handoffs = new Map<string, Handoff>();

export const mockHandoffProvider: HandoffProvider = {
  id: "mock_handoff",
  isMock: true,
  async request({ anonSessionId, match, summary }: { anonSessionId: string; match: Match; summary: string }) {
    await delay(600);
    const id = `ho_${Date.now().toString(36)}`;
    const handoff: Handoff = {
      id,
      anonSessionId,
      productId: match.productId,
      productName: match.productName,
      partnerName: match.partnerName,
      channel: "in_app",
      status: "queued",
      queuePosition: 1 + (seedFrom(id) % 4),
      createdAt: new Date().toISOString(),
      summary,
      demo: true,
    };
    handoffs.set(id, handoff);
    return handoff;
  },
  async get(id: string) {
    return handoffs.get(id) ?? null;
  },
  async list(anonSessionId: string) {
    return [...handoffs.values()].filter((h) => h.anonSessionId === anonSessionId);
  },
};
