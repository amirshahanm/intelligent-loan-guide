import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { FINANCE_SERVICES, isFinanceServiceId } from "./finance-services";
import { universalNeedFromText } from "@/core/universal-need-extract";
import { discoverRouteFamilies } from "@/core/opportunity-routes";

describe("finance service entry contracts", () => {
  test("every purpose draft reaches the existing intended route family", () => {
    const expected = {
      "cash-loan": "money_cash_facility",
      "working-capital": "business_working_capital",
      "business-equipment": "business_equipment_finance",
      "property-finance": "buy_property_finance",
    };
    for (const [id, content] of Object.entries(FINANCE_SERVICES)) {
      for (const purpose of content.purposes) {
        const need = universalNeedFromText(`${content.need} هدف من ${purpose} است.`, {});
        assert.equal(
          discoverRouteFamilies(need)[0]?.route.id,
          expected[id as keyof typeof expected],
        );
      }
    }
  });
  test("four uncovered services have distinct needs and no empty destinations", () => {
    assert.deepEqual(Object.keys(FINANCE_SERVICES), [
      "cash-loan",
      "working-capital",
      "business-equipment",
      "property-finance",
    ]);
    assert.equal(new Set(Object.values(FINANCE_SERVICES).map((service) => service.need)).size, 4);
    for (const service of Object.values(FINANCE_SERVICES)) {
      assert.equal(service.purposes.length, 3);
      assert.equal(service.questions.length, 3);
      assert.ok(service.dependency.length > 20);
    }
  });
  test("unknown and inherited keys never resolve as services", () => {
    for (const id of ["unknown", "toString", "constructor", "__proto__", ""])
      assert.equal(isFinanceServiceId(id), false);
    for (const id of Object.keys(FINANCE_SERVICES)) assert.equal(isFinanceServiceId(id), true);
  });
});
