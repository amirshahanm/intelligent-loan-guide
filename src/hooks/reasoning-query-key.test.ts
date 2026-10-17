import { test } from "node:test";
import assert from "node:assert/strict";
import { reasoningQueryKey } from "./reasoning-query-key";

test("different need with identical financial slots does not reuse the previous route confirmation", () => {
  assert.notDeepEqual(
    reasoningQueryKey("{}", "ENGAGED", "خرید ملک"),
    reasoningQueryKey("{}", "ENGAGED", "تجهیزات کسب‌وکار"),
  );
  assert.deepEqual(
    reasoningQueryKey("{}", "ENGAGED", "وام"),
    reasoningQueryKey("{}", "ENGAGED", "وام"),
  );
});
