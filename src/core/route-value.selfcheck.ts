import { discoverRouteFamilies } from "./opportunity-routes";
import { scorePrequoteRouteValue } from "./route-value";
import { universalNeedFromText } from "./universal-need-extract";

const failures: string[] = [];
const check = (name: string, condition: boolean) => {
  if (!condition) failures.push(name);
};

const vehicleRoutes = discoverRouteFamilies(universalNeedFromText("ماشین اقساطی می‌خوام", {}));
const vehiclePrimary = vehicleRoutes[0];
const vehicleValue = scorePrequoteRouteValue(vehiclePrimary);
check("route value is bounded", vehicleValue.score >= 0 && vehicleValue.score <= 100);
check("route value phase is prequote", vehicleValue.phase === "prequote");
check("demo evidence is conservative", vehicleValue.evidenceStrength === 20);
check(
  "partner-required route is not treated as fully executable",
  vehicleValue.executionReadiness === 55,
);

const tradeRoutes = discoverRouteFamilies(universalNeedFromText("برای واردات کالا مسیر می‌خوام", {}));
const tradeIntelligence = tradeRoutes.find((x) => x.route.id === "trade_opportunity_intelligence");
const tradeFinance = tradeRoutes.find((x) => x.route.id === "trade_finance");
if (!tradeIntelligence || !tradeFinance) failures.push("trade routes exist");
else {
  const intelligenceValue = scorePrequoteRouteValue(tradeIntelligence);
  const financeValue = scorePrequoteRouteValue(tradeFinance);
  check(
    "license-required trade finance scores below coming-soon intelligence at equal family fit",
    financeValue.score < intelligenceValue.score,
  );
}

if (failures.length) {
  console.error("route value self-check FAILED:\n - " + failures.join("\n - "));
  process.exit(1);
}

console.log("route value self-check passed");
