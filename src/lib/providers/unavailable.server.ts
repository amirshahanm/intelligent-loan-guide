import type {
  CreditProvider,
  HandoffProvider,
  PaymentProvider,
  ProductCatalogProvider,
  SmsProvider,
} from "./types";

function unavailable(name: string): never {
  throw new Error(`provider_unavailable:${name}`);
}

/**
 * Production-safe placeholders. They never simulate success and therefore may
 * keep the public product online while a regulated/external capability is not
 * yet connected. UI/server functions must surface the unavailable state.
 */
export const unavailableCatalogProvider: ProductCatalogProvider = {
  id: "unavailable_catalog",
  isMock: false,
  async listPartners() {
    return [];
  },
  async listProducts() {
    return [];
  },
  asOf() {
    return new Date(0).toISOString();
  },
};

export const unavailableCreditProvider: CreditProvider = {
  id: "unavailable_credit",
  isMock: false,
  priceIrr() {
    return 0;
  },
  async check() {
    return unavailable("credit");
  },
};

export const unavailablePaymentProvider: PaymentProvider = {
  id: "unavailable_payment",
  isMock: false,
  async createIntent() {
    return unavailable("payment");
  },
  async confirm() {
    return unavailable("payment");
  },
};

export const unavailableSmsProvider: SmsProvider = {
  id: "unavailable_sms",
  isMock: false,
  async sendOtp() {
    return unavailable("sms");
  },
};

export const unavailableHandoffProvider: HandoffProvider = {
  id: "unavailable_handoff",
  isMock: false,
  async request() {
    return unavailable("handoff");
  },
  async get() {
    return unavailable("handoff");
  },
  async list() {
    return unavailable("handoff");
  },
};
