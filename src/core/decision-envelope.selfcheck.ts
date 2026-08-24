import { buildAuthoritativeDecisionEnvelope, semanticDecisionSnapshot } from "./decision-envelope";
import { fact, userConfirmed, type IntentSlots } from "./types";

const failures: string[] = [];
const check = (name: string, condition: boolean) => {
  if (!condition) failures.push(name);
};

const carSlots: IntentSlots = {
  purpose: fact("car", userConfirmed()),
  amount: fact(8_000_000_000, userConfirmed()),
};

const first = buildAuthoritativeDecisionEnvelope(carSlots);
const second = buildAuthoritativeDecisionEnvelope(carSlots);

check("vehicle becomes Buy primary world", first.primaryWorld === "buy");
check("vehicle vertical is preserved", first.vertical === "vehicle");
check("vehicle finance is first persistable route", first.persistableRoutes[0]?.route_key === "buy_vehicle_finance");
check(
  "capability status normalized for database",
  first.persistableRoutes[0]?.capability_status === "partner_required",
);
check(
  "semantic decision snapshot is deterministic across retries",
  JSON.stringify(semanticDecisionSnapshot(first)) === JSON.stringify(semanticDecisionSnapshot(second)),
);
check(
  "volatile reasoning run ids are allowed to differ",
  first.reasoning.runId !== second.reasoning.runId || first.reasoning.at !== second.reasoning.at,
);

if (failures.length) {
  console.error("decision envelope self-check FAILED:\n - " + failures.join("\n - "));
  process.exit(1);
}

console.log(`decision envelope self-check passed (${first.persistableRoutes.length} routes)`);
