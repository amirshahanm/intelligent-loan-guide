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
 * Authoritative provider registry. This module is server-only.
 * Real provider adapters replace values here without changing UI/domain cores.
 */
export const serverProviders: {
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

export const serverMockProviderKeys = listMockProviderKeys(serverProviders);

export function assertServerProviderSafety(mode: DeploymentMode): void {
  assertProviderSafety(serverProviders, mode);
}
