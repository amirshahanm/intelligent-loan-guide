import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyOwnedReportPayment } from "./report-verification.server";

test("disabled report payments never reach storage or provider", async () => {
  const previous = process.env.TASHILRADAR_REPORT_PAYMENTS;
  process.env.TASHILRADAR_REPORT_PAYMENTS = "false";
  try {
    await assert.rejects(
      verifyOwnedReportPayment({
        reportId: "invalid",
        sessionId: "invalid",
        sessionCapability: "test-only",
        authority: "invalid",
      }),
      /report_payments_unavailable/,
    );
  } finally {
    if (previous === undefined) delete process.env.TASHILRADAR_REPORT_PAYMENTS;
    else process.env.TASHILRADAR_REPORT_PAYMENTS = previous;
  }
});
