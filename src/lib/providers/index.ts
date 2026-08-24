import { millionToman } from "@/lib/money";
import {
  confirmCreditPaymentIntent,
  createCreditPaymentIntent,
  executeCreditCheck,
} from "@/lib/credit.functions";
import { mockCatalogProvider, mockHandoffProvider, mockSmsProvider } from "./mock";
import type {
  CreditProvider,
  HandoffProvider,
  PaymentProvider,
  ProductCatalogProvider,
  SmsProvider,
} from "./types";

/**
 * Browser-safe provider facade.
 *
 * Sensitive provider execution is never owned by React. Credit/payment calls
 * cross TanStack server-function boundaries; the authoritative adapter registry
 * lives in `server-registry.server.ts`.
 *
 * Catalog/SMS/Handoff remain Phase-1 mock paths and are explicitly blocked from
 * production by the server registry safety gate until migrated or replaced.
 */
const creditFacade: CreditProvider = {
  id: "server_credit_facade",
  isMock: true,
  priceIrr: () => millionToman(0.089),
  check: (request) => executeCreditCheck({ data: request }),
};

const paymentFacade: PaymentProvider = {
  id: "server_payment_facade",
  isMock: true,
  createIntent: (amountIrr) => createCreditPaymentIntent({ data: { amountIrr } }),
  confirm: (intentId) => confirmCreditPaymentIntent({ data: { intentId } }),
};

export const providers: {
  catalog: ProductCatalogProvider;
  credit: CreditProvider;
  payment: PaymentProvider;
  sms: SmsProvider;
  handoff: HandoffProvider;
} = {
  catalog: mockCatalogProvider,
  credit: creditFacade,
  payment: paymentFacade,
  sms: mockSmsProvider,
  handoff: mockHandoffProvider,
};

/** Current public/demo facade state. Authoritative safety is checked server-side. */
export const mockProviderKeys = Object.entries(providers)
  .filter(([, provider]) => provider.isMock)
  .map(([key]) => key);
export const anyMock = mockProviderKeys.length > 0;

export * from "./types";
