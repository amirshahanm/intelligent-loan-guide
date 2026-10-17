import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  faDays,
  faMonths,
  faNumber,
  faPercent,
  faRelativeTime,
  formatToman,
  formatTomanCompact,
  fromToman,
  toDisplayDigits,
  toLatinDigits,
} from "./money";

test("platform numbers use Latin digits while Persian text stays Persian", () => {
  assert.equal(toDisplayDigits("وام ۳۰۰ و ٢٤ ماه"), "وام 300 و 24 ماه");
  assert.equal(faNumber(12345), "12٬345");
  assert.equal(formatToman(fromToman(300000000)), "300٬000٬000 تومان");
  assert.equal(formatTomanCompact(fromToman(1500000)), "1٫5 میلیون تومان");
  assert.equal(faPercent(42), "42٪");
  assert.equal(faDays(12), "12 روز");
  assert.equal(faMonths(24), "24 ماه");
  assert.equal(
    faRelativeTime("2026-10-09T10:00:00Z", new Date("2026-10-09T10:12:00Z")),
    "12 دقیقه پیش",
  );
});

test("Persian and Arabic numeric input remains supported", () => {
  assert.equal(toLatinDigits("۱۲۳٤٥٦"), "123456");
  assert.equal(fromToman(300000000), 3000000000);
});
