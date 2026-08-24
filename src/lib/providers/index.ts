import { millionToman } from "@/lib/money";
import {
  confirmCreditPaymentIntent,
  createCreditPaymentIntent,
  executeCreditCheck,
} from "@/lib/credit.functions";
import { mockCatalogProvider } from "./mock";
import type {
  CreditProvider,
  HandoffProvider,
  PaymentProvider,
  ProductCatalogProvider,
  SmsProvider,
} from "./types";

type StoredSession = {
  backend?: {
    sessionId?: string;
    caseId?: string;
  };
};

function browserContinuity(): { sessionId: string; sessionCapability: string; caseId: string } {
  if (typeof window === "undefined") throw new Error("browser_continuity_unavailable");
  const raw = window.localStorage.getItem("tashilradar.session.v1");
  const sessionCapability = window.sessionStorage.getItem("tashilradar.backend.capability.v1");
  const parsed = raw ? (JSON.parse(raw) as StoredSession) : null;
  const sessionId = parsed?.backend?.sessionId;
  const caseId = parsed?.backend?.caseId;
  if (!sessionId || !caseId || !sessionCapability) {
    throw new Error("server_confirmed_case_required");
  }
  return { sessionId, sessionCapability, caseId };
}

/** Browser-safe facade: all sensitive provider work crosses a server function. */
const creditFacade: CreditProvider = {
  id: "server_credit_facade",
  isMock: false,
  priceIrr: () => millionToman(0.089),
  check: (request) =>
    executeCreditCheck({
      data: {
        ...request,
        ...browserContinuity(),
      },
    }),
};

const paymentFacade: PaymentProvider = {
  id: "server_payment_facade",
  isMock: false,
  createIntent: (amountIrr) => createCreditPaymentIntent({ data: { amountIrr } }),
  confirm: (intentId) => confirmCreditPaymentIntent({ data: { intentId } }),
};

const serverOnlySmsFacade: SmsProvider = {
  id: "server_only_sms",
  isMock: false,
  async sendOtp() {
    throw new Error("sms_server_boundary_required");
  },
};

const serverOnlyHandoffFacade: HandoffProvider = {
  id: "server_only_handoff",
  isMock: false,
  async request() {
    throw new Error("handoff_server_boundary_required");
  },
  async get() {
    throw new Error("handoff_server_boundary_required");
  },
  async list() {
    throw new Error("handoff_server_boundary_required");
  },
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
  sms: serverOnlySmsFacade,
  handoff: serverOnlyHandoffFacade,
};

export const mockProviderKeys = Object.entries(providers)
  .filter(([, provider]) => provider.isMock)
  .map(([key]) => key);
export const anyMock = mockProviderKeys.length > 0;

export * from "./types";
