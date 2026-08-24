import {
  mockCatalogProvider,
  mockCreditProvider,
  mockHandoffProvider,
  mockPaymentProvider,
  mockSmsProvider,
} from "./mock";
import { assertProviderSafety, listMockProviderKeys, type DeploymentMode } from "./safety";
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

export const mockProviderKeys = listMockProviderKeys(providers);
export const anyMock = mockProviderKeys.length > 0;

/**
 * Must be called by the server boundary before serving a deployment explicitly
 * marked as production. A production deployment backed by any mock provider is
 * rejected instead of quietly presenting simulated financial capabilities.
 */
export function assertConfiguredProviderSafety(mode: DeploymentMode): void {
  assertProviderSafety(providers, mode);
}

export { parseDeploymentMode } from "./safety";
export type { DeploymentMode } from "./safety";
export * from "./types";
