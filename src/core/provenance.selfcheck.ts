import { catalogFact, providerVerified, userConfirmed, userStated } from "./types";

const failures: string[] = [];

function check(name: string, condition: boolean): void {
  if (!condition) failures.push(name);
}

const demoCatalog = catalogFact("2026-01-01T00:00:00.000Z");
const liveCatalog = catalogFact("2026-01-01T00:00:00.000Z", false);
const demoProvider = providerVerified();
const liveProvider = providerVerified(1, false);

check("catalog defaults to demo for current Phase 1 adapters", demoCatalog.demo === true);
check("live catalog provenance can omit demo flag", liveCatalog.demo === undefined);
check("provider verification defaults to demo for current mocks", demoProvider.demo === true);
check("live provider verification can omit demo flag", liveProvider.demo === undefined);
check("live provider remains authoritative provenance", liveProvider.source === "provider_verified");
check("user stated facts are never marked demo", userStated().demo === undefined);
check("user confirmed facts are never marked demo", userConfirmed().demo === undefined);

if (failures.length) {
  console.error("provenance self-check FAILED:\n - " + failures.join("\n - "));
  process.exit(1);
}

console.log("provenance self-check passed (demo/live truth boundary is representable)");
