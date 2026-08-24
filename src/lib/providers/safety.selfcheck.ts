import { assertConfiguredProviderSafety, mockProviderKeys, parseDeploymentMode } from "./index";

const failures: string[] = [];

function check(name: string, condition: boolean): void {
  if (!condition) failures.push(name);
}

check("all current provider slots are explicitly detected as mock", mockProviderKeys.length === 5);
check("unknown mode defaults to demo", parseDeploymentMode(undefined) === "demo");
check("invalid mode defaults to demo", parseDeploymentMode("live") === "demo");
check("production mode parses", parseDeploymentMode("production") === "production");

let productionRejectedMocks = false;
try {
  assertConfiguredProviderSafety("production");
} catch (error) {
  productionRejectedMocks =
    error instanceof Error && error.message.startsWith("unsafe_production_provider_configuration:");
}
check("production rejects current mock provider registry", productionRejectedMocks);

let demoAllowsMocks = true;
try {
  assertConfiguredProviderSafety("demo");
  assertConfiguredProviderSafety("staging");
} catch {
  demoAllowsMocks = false;
}
check("demo and staging intentionally allow labelled mocks", demoAllowsMocks);

if (failures.length) {
  console.error("provider safety self-check FAILED:\n - " + failures.join("\n - "));
  process.exit(1);
}

console.log(
  `provider safety self-check passed (${mockProviderKeys.length} mock slots blocked from production)`,
);
