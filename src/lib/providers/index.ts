import {
  mockCatalogProvider,
  mockCreditProvider,
  mockHandoffProvider,
  mockPaymentProvider,
  mockSmsProvider,
} from "./mock";
import type {
  CreditProvider,
  HandoffProvider,
  PaymentProvider,
  ProductCatalogProvider,
  SmsProvider,
} from "./types";

/**
 * Provider registry. Phase 1 binds every slot to a mock. Production wiring
 * replaces the value here only — no UI or engine code changes.
 */
export const providers: {
  catalog: ProductCatalogProvider;
  credit: CreditProvider;
  payment: PaymentProvider;
  sms: SmsProvider;
  handoff: HandoffProvider;
} = {
  catalog: mockCatalogProvider,
  credit: mockCreditProvider,
  payment: mockPaymentProvider,
  sms: mockSmsProvider,
  handoff: mockHandoffProvider,
};

export const anyMock = Object.values(providers).some((p) => "isMock" in p && p.isMock);

export * from "./types";
