import { strict as assert } from "node:assert";
import { test } from "node:test";
import { configuredApiirSmsProvider, createApiirSmsProvider } from "./apiir-sms.server";

test("API.ir SMS is disabled by default and requires a server token", () => {
  assert.equal(configuredApiirSmsProvider({}), null);
  assert.equal(configuredApiirSmsProvider({ TASHILRADAR_APIIR_SMS_ENABLED: "true" }), null);
  assert.equal(configuredApiirSmsProvider({ TASHILRADAR_APIIR_TOKEN: "test-only" }), null);
});

test("OTP uses the documented endpoint, normalized phone and application code", async () => {
  const transport: typeof fetch = async (url, options) => {
    assert.equal(url, "https://s.api.ir/api/sw1/SmsOTP");
    assert.equal(options?.redirect, "error");
    assert.deepEqual(JSON.parse(String(options?.body)), {
      mobile: "09121112222",
      code: "012345",
      template: 1,
    });
    return Response.json({ success: true, data: true });
  };
  assert.deepEqual(
    await createApiirSmsProvider("test-only", transport).sendOtp("+989121112222", "012345"),
    { sent: true, expiresInSeconds: 120 },
  );
});

test("invalid input never calls or bills the provider", async () => {
  let calls = 0;
  const transport: typeof fetch = async () => {
    calls++;
    return Response.json({});
  };
  await assert.rejects(createApiirSmsProvider("test-only", transport).sendOtp("bad", "012345"));
  assert.equal(calls, 0);
});

test("HTTP success alone and ambiguous provider results cannot fake delivery", async () => {
  for (const body of [{ success: false, data: true }, { success: true, data: false }, {}, null]) {
    const transport: typeof fetch = async () => Response.json(body);
    await assert.rejects(
      createApiirSmsProvider("test-only", transport).sendOtp("09121112222", "012345"),
      /apiir_delivery_failed/,
    );
  }
});

test("network failure is redacted and never retried", async () => {
  let calls = 0;
  const transport: typeof fetch = async () => {
    calls++;
    throw new Error("private-provider-detail");
  };
  await assert.rejects(
    createApiirSmsProvider("test-only", transport).sendOtp("09121112222", "012345"),
    { message: "apiir_delivery_failed" },
  );
  assert.equal(calls, 1);
});
