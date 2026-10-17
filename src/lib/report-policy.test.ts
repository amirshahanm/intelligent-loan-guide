import { test } from "node:test";
import assert from "node:assert/strict";
import { REPORT_OFFER, canDeliverReport, validatePreparedReport } from "./report-policy";
test("approved price is 110 thousand Toman, not 110 million", () => {
  assert.equal(REPORT_OFFER.priceToman, 110000);
  assert.equal(REPORT_OFFER.amountIrr, 1100000);
  assert.equal(REPORT_OFFER.amountIrr, REPORT_OFFER.priceToman * 10);
});
test("callback and pending/uncertain payments cannot unlock a report", () => {
  for (const status of ["prepared", "payment_pending", "payment_uncertain"] as const)
    assert.equal(canDeliverReport(status), false);
  assert.equal(canDeliverReport("paid"), true);
  assert.equal(canDeliverReport("delivered"), true);
  assert.equal(validatePreparedReport("short generic answer"), false);
});
