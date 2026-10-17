import { test } from "node:test";
import assert from "node:assert/strict";
import { createZarinpalReportAdapter } from "./zarinpal-report.server";

const authority = "A".repeat(36);
const callbackUrl = "https://tashilradar.com/payment/callback";
test("missing merchant and foreign callback cannot issue payment requests", async () => {
  let calls = 0;
  const transport: typeof fetch = async () => {
    calls++;
    return Response.json({});
  };
  await assert.rejects(
    createZarinpalReportAdapter({ callbackUrl, transport }).request(),
    /payment_not_configured/,
  );
  await assert.rejects(
    createZarinpalReportAdapter({
      callbackUrl: "https://evil.example/callback",
      merchantId: "test",
      transport,
    }).request(),
    /invalid_payment_callback/,
  );
  assert.equal(calls, 0);
});
test("request uses fixed founder-approved Rial amount", async () => {
  const adapter = createZarinpalReportAdapter({
    callbackUrl,
    merchantId: "test-only",
    transport: async (url, init) => {
      assert.equal(url, "https://api.zarinpal.com/pg/v4/payment/request.json");
      assert.equal(JSON.parse(String(init?.body)).amount, 1100000);
      return Response.json({ data: { code: 100, authority } });
    },
  });
  assert.equal((await adapter.request()).authority, authority);
});
test("only server verification with a reference succeeds; duplicate needs reconciliation", async () => {
  for (const [code, expected] of [
    [100, "verified"],
    [101, "reconcile"],
    [-21, "not_verified"],
  ] as const) {
    const adapter = createZarinpalReportAdapter({
      callbackUrl,
      merchantId: "test-only",
      transport: async () => Response.json({ data: { code, ref_id: 12345 } }),
    });
    assert.equal((await adapter.verify(authority)).status, expected);
  }
});
test("timeout is redacted and never retried", async () => {
  let calls = 0;
  const adapter = createZarinpalReportAdapter({
    callbackUrl,
    merchantId: "test-only",
    transport: async () => {
      calls++;
      throw new Error("sensitive upstream details");
    },
  });
  await assert.rejects(adapter.verify(authority), /^Error: payment_uncertain$/);
  assert.equal(calls, 1);
});
