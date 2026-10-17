import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMillionTomanInput } from "./amount-input";

test("reject malformed, negative, zero and unsafe amount without rewriting it", () => {
  for (const input of ["-300", "+300", "300abc", "1e3", "", "0", "۰", "1.2.3", "9".repeat(30)]) {
    assert.equal(parseMillionTomanInput(input), null, input);
  }
});
test("preserve Persian, Arabic and fractional million Toman amounts", () => {
  assert.equal(parseMillionTomanInput("۳۰۰"), 3_000_000_000);
  assert.equal(parseMillionTomanInput("٣٠٠"), 3_000_000_000);
  assert.equal(parseMillionTomanInput(" 1.5 "), 15_000_000);
  assert.equal(parseMillionTomanInput("۱٫۵"), 15_000_000);
});
