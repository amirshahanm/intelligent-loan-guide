import { discoverRouteFamilies } from "./opportunity-routes";
import { universalNeedFromText } from "./universal-need-extract";

const failures: string[] = [];
const check = (name: string, condition: boolean) => {
  if (!condition) failures.push(name);
};

const vehicle = universalNeedFromText("می‌خوام ماشین اقساطی بخرم", {});
check("vehicle text maps to purchase_vehicle", vehicle.kind === "purchase_vehicle");
check(
  "vehicle route is buy first",
  discoverRouteFamilies(vehicle)[0]?.route.id === "buy_vehicle_finance",
);

const equipment = universalNeedFromText("برای تجهیز مطب دستگاه پزشکی لازم دارم", {});
check("equipment text maps to equipment", equipment.kind === "equipment");
check(
  "equipment route is business equipment finance first",
  discoverRouteFamilies(equipment)[0]?.route.id === "business_equipment_finance",
);

const importing = universalNeedFromText("می‌خوام تجهیزات از خارج وارد کنم", {});
check("import text maps to trade_import", importing.kind === "trade_import");
check(
  "import route is trade intelligence first",
  discoverRouteFamilies(importing)[0]?.route.id === "trade_opportunity_intelligence",
);

const exporting = universalNeedFromText("برای صادرات محصولم دنبال مسیر هستم", {});
check("export text maps to trade_export", exporting.kind === "trade_export");

const cash = universalNeedFromText("۳۰۰ میلیون وام می‌خوام", {});
check("loan language maps to cash", cash.kind === "cash");
check(
  "cash route remains money first",
  discoverRouteFamilies(cash)[0]?.route.id === "money_cash_facility",
);

if (failures.length) {
  console.error("universal need extraction self-check FAILED:\n - " + failures.join("\n - "));
  process.exit(1);
}

console.log("universal need extraction self-check passed");
