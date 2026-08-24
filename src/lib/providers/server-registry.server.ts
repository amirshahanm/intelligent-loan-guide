import {
  mockCatalogProvider,
  mockCreditProvider,
  mockHandoffProvider,
  mockPaymentProvider,
  mockSmsProvider,
} from "./mock";
import {
  unavailableCatalogProvider,
  unavailableCreditProvider,
  unavailableHandoffProvider,
  unavailablePaymentProvider,
  unavailableSmsProvider,
} from "./unavailable.server";
import { assertProviderSafety, listMockProviderKeys, parseDeploymentMode, type DeploymentMode } from "./safety";
import type {
  CreditProvider,
  HandoffProvider,
  PaymentProvider,
  ProductCatalogProvider,
  SmsProvider,
} from "./types";

const mode = parseDeploymentMode(process.env.TASHILRADAR_DEPLOYMENT_MODE);
const production = mode === "production";

/**
 * Authoritative server registry.
 *
 * Demo/staging intentionally exercise mocks. Production never falls back to a
 * mock: until a real adapter is wired, the capability is explicitly unavailable
 * while the rest of the public product remains online.
 */
export const serverProviders: {
  catalog: ProductCatalogProvider;
  credit: CreditProvider;
  payment: PaymentProvider;
  sms: SmsProvider;
  handoff: HandoffProvider;
} = production
  ? {
      catalog: unavailableCatalogProvider,
      credit: unavailableCreditProvider,
      payment: unavailablePaymentProvider,
      sms: unavailableSmsProvider,
      handoff: unavailableHandoffProvider,
    }
  : {
      catalog: mockCatalogProvider,
      credit: mockCreditProvider,
      payment: mockPaymentProvider,
      sms: mockSmsProvider,
      handoff: mockHandoffProvider,
    };

export const serverMockProviderKeys = listMockProviderKeys(serverProviders);

export function assertServerProviderSafety(deploymentMode: DeploymentMode): void {
  assertProviderSafety(serverProviders, deploymentMode);
}
