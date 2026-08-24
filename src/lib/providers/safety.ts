import type {
  CreditProvider,
  HandoffProvider,
  PaymentProvider,
  ProductCatalogProvider,
  SmsProvider,
} from "./types";

export type DeploymentMode = "demo" | "staging" | "production";

type ProviderSet = {
  catalog: ProductCatalogProvider;
  credit: CreditProvider;
  payment: PaymentProvider;
  sms: SmsProvider;
  handoff: HandoffProvider;
};

function providerIsMock(provider: unknown): boolean {
  return Boolean(
    provider &&
    typeof provider === "object" &&
    "isMock" in provider &&
    (provider as { isMock?: unknown }).isMock === true,
  );
}

export function listMockProviderKeys(providers: ProviderSet): Array<keyof ProviderSet> {
  return (Object.keys(providers) as Array<keyof ProviderSet>).filter((key) =>
    providerIsMock(providers[key]),
  );
}

/**
 * Production is fail-closed: simulated financial, payment, OTP or handoff
 * providers must never silently back a deployment marked as production.
 *
 * Demo/staging may intentionally use mocks, but the UI must label simulated
 * facts and capabilities clearly.
 */
export function assertProviderSafety(providers: ProviderSet, mode: DeploymentMode): void {
  if (mode !== "production") return;

  const mockKeys = listMockProviderKeys(providers);
  if (mockKeys.length === 0) return;

  throw new Error(`unsafe_production_provider_configuration:${mockKeys.join(",")}`);
}

export function parseDeploymentMode(value: string | undefined): DeploymentMode {
  if (value === "production" || value === "staging" || value === "demo") return value;
  return "demo";
}
