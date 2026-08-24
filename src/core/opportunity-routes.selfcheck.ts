import {
  discoverRouteFamilies,
  listRouteFamilies,
  universalNeedFromLegacySlots,
  type UniversalNeed,
} from "./opportunity-routes";
import { fact, userConfirmed, type IntentSlots } from "./types";

const failures: string[] = [];

function check(name: string, condition: boolean): void {
  if (!condition) failures.push(name);
}

const carSlots: IntentSlots = {
  purpose: fact("car", userConfirmed()),
};
const carNeed = universalNeedFromLegacySlots(carSlots);
check("legacy car intent becomes vehicle purchase need", carNeed.kind === "purchase_vehicle");

const carRoutes = discoverRouteFamilies(carNeed);
check("vehicle finance is primary car route", carRoutes[0]?.route.id === "buy_vehicle_finance");
check(
  "cash facility remains a vehicle fallback instead of replacing commerce",
  carRoutes.some((match) => match.route.id === "money_cash_facility"),
);

const businessNeed = universalNeedFromLegacySlots({
  purpose: fact("business", userConfirmed()),
});
const businessRoutes = discoverRouteFamilies(businessNeed);
check(
  "business working capital is primary business route",
  businessRoutes[0]?.route.id === "business_working_capital",
);

const tradeNeed: UniversalNeed = {
  kind: "trade_import",
  source: "ai_structured",
  confidence: 1,
};
const tradeRoutes = discoverRouteFamilies(tradeNeed);
check(
  "trade intelligence is primary before trade finance execution",
  tradeRoutes[0]?.route.id === "trade_opportunity_intelligence",
);
check(
  "trade finance is explicitly license gated",
  tradeRoutes.some(
    (match) =>
      match.route.id === "trade_finance" && match.route.capabilityStatus === "LICENSE_REQUIRED",
  ),
);

const families = listRouteFamilies();
check("route ids are unique", new Set(families.map((route) => route.id)).size === families.length);
check(
  "every non-active demo capability captures useful demand",
  families
    .filter((route) => route.capabilityStatus !== "ACTIVE")
    .every((route) => route.canCaptureDemand),
);
check(
  "vehicle exists as official Buy vertical",
  families.some((route) => route.world === "buy" && route.id === "buy_vehicle_finance"),
);

const deterministicA = JSON.stringify(discoverRouteFamilies(carNeed));
const deterministicB = JSON.stringify(discoverRouteFamilies(carNeed));
check("route discovery is deterministic", deterministicA === deterministicB);

if (failures.length) {
  console.error("opportunity route self-check FAILED:\n - " + failures.join("\n - "));
  process.exit(1);
}

console.log(`opportunity route self-check passed (${families.length} route families)`);
