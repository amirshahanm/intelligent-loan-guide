import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createApiirMatchingAdapter } from "./apiir-matching.server";

const context = {
  caseId: "00000000-0000-4000-8000-000000000001",
  inquiryId: "00000000-0000-4000-8000-000000000002",
};
const input = { nationalCode: "0010007700", mobile: "09120000000", isCompany: false as const };

test("authorization refusal makes no provider request", async () => {
  let calls = 0;
  const adapter = createApiirMatchingAdapter({
    token: "test-only",
    authorize: async () => {
      throw new Error("consent_required");
    },
    transport: async () => {
      calls++;
      return Response.json({});
    },
  });
  await assert.rejects(adapter.check("Shahkar", input, context), /consent_required/);
  assert.equal(calls, 0);
});

test("documented successful false is a mismatch, not a fabricated credit score", async () => {
  const adapter = createApiirMatchingAdapter({
    token: "test-only",
    authorize: async (service, evidence) => {
      assert.equal(service, "Shahkar");
      assert.deepEqual(evidence, context);
    },
    transport: async (url, options) => {
      assert.equal(url, "https://s.api.ir/api/sw1/Shahkar");
      assert.deepEqual(JSON.parse(String(options?.body)), input);
      return Response.json({ success: true, data: false });
    },
  });
  const result = await adapter.check("Shahkar", input, context);
  assert.equal(result.matched, false);
  assert.equal(result.demo, false);
  assert.equal("score" in result, false);
});

test("invalid bank inputs are rejected before authorization or billing", async () => {
  let authorized = false;
  const adapter = createApiirMatchingAdapter({
    token: "test-only",
    authorize: async () => {
      authorized = true;
    },
  });
  await assert.rejects(
    adapter.check(
      "IbanMatch",
      { nationalCode: input.nationalCode, birthDate: "1370/1/1", iban: "bad" },
      context,
    ),
  );
  assert.equal(authorized, false);
});

test("vendor failure remains unknown, redacted and is never retried", async () => {
  let calls = 0;
  const adapter = createApiirMatchingAdapter({
    token: "test-only",
    authorize: async () => {},
    transport: async () => {
      calls++;
      return Response.json({ success: false, data: false, message: "private detail" });
    },
  });
  await assert.rejects(adapter.check("Shahkar", input, context), {
    message: "apiir_inquiry_failed",
  });
  assert.equal(calls, 1);
});

test("card and IBAN requests use their own documented routes", async () => {
  const paths: string[] = [];
  const adapter = createApiirMatchingAdapter({
    token: "test-only",
    authorize: async () => {},
    transport: async (url) => {
      paths.push(String(url));
      return Response.json({ success: true, data: true });
    },
  });
  await adapter.check(
    "CardMatch",
    { nationalCode: input.nationalCode, birthDate: "1370/1/1", cardNumber: "6037990000000000" },
    context,
  );
  await adapter.check(
    "IbanMatch",
    { nationalCode: input.nationalCode, birthDate: "1370/1/1", iban: "IR820540102680020817909002" },
    context,
  );
  assert.deepEqual(paths, [
    "https://s.api.ir/api/sw1/CardMatch",
    "https://s.api.ir/api/sw1/IbanMatch",
  ]);
});
