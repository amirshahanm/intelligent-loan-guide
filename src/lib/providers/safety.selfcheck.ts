import { assertProviderSafety, listMockProviderKeys, parseDeploymentMode } from "./safety";
import {
  mockCatalogProvider,
  mockCreditProvider,
  mockHandoffProvider,
  mockPaymentProvider,
  mockSmsProvider,
} from "./mock";

const failures: string[] = [];

function check(name: string, condition: boolean): void {
  if (!condition) failures.push(name);
}

const mockSet = {
  catalog: mockCatalogProvider,
  credit: mockCreditProvider,
  payment: mockPaymentProvider,
  sms: mockSmsProvider,
  handoff: mockHandoffProvider,
};

const unavailableLikeSet = {
  catalog: { ...mockCatalogProvider, id: "unavailable_catalog", isMock: false },
  credit: { ...mockCreditProvider, id: "unavailable_credit", isMock: false },
  payment: { ...mockPaymentProvider, id: "unavailable_payment", isMock: false },
  sms: { ...mockSmsProvider, id: "unavailable_sms", isMock: false },
  handoff: { ...mockHandoffProvider, id: "unavailable_handoff", isMock: false },
};

const mockKeys = listMockProviderKeys(mockSet);
check("all five simulated provider slots are detected", mockKeys.length === 5);
check("unknown mode defaults to demo", parseDeploymentMode(undefined) === "demo");
check("invalid mode defaults to demo", parseDeploymentMode("live") === "demo");
check("production mode parses", parseDeploymentMode("production") === "production");

let productionRejectedMocks = false;
try {
  assertProviderSafety(mockSet, "production");
} catch (error) {
  productionRejectedMocks =
    error instanceof Error && error.message.startsWith("unsafe_production_provider_configuration:");
}
check("production rejects mock provider execution", productionRejectedMocks);

let nonMockUnavailableAllowed = true;
try {
  assertProviderSafety(unavailableLikeSet, "production");
} catch {
  nonMockUnavailableAllowed = false;
}
check("production permits explicit non-simulated unavailable adapters", nonMockUnavailableAllowed);

let demoAllowsMocks = true;
try {
  assertProviderSafety(mockSet, "demo");
  assertProviderSafety(mockSet, "staging");
} catch {
  demoAllowsMocks = false;
}
check("demo and staging intentionally allow labelled mocks", demoAllowsMocks);

if (failures.length) {
  console.error("provider safety self-check FAILED:\n - " + failures.join("\n - "));
  process.exit(1);
}

console.log("provider safety self-check passed (mock production rejection + graceful-unavailable policy)");
