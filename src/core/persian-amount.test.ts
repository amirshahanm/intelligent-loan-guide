import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractAmount, extractSlots, findAmountMentions } from "./extract";
import { universalNeedFromText } from "./universal-need-extract";

const toman = (n: number) => n * 10;
const amountOf = (text: string) => extractAmount(text);

test("Persian decimal separators are read as decimals, never concatenated", () => {
  assert.equal(amountOf("۱/۵ میلیارد"), toman(1_500_000_000));
  assert.equal(amountOf("۱٫۵ میلیارد تومان"), toman(1_500_000_000));
  assert.equal(amountOf("1.5 میلیارد"), toman(1_500_000_000));
  assert.equal(amountOf("۲/۲۵ میلیارد"), toman(2_250_000_000));
});

test("compound billions and millions add up", () => {
  assert.equal(amountOf("۱ میلیارد و ۵۰۰ میلیون"), toman(1_500_000_000));
  assert.equal(amountOf("۲ میلیارد و ۳۰۰"), toman(2_300_000_000));
  assert.equal(amountOf("یک میلیارد و پانصد"), toman(1_500_000_000));
  assert.equal(amountOf("۵ میلیون و ۲۰۰ هزار تومان"), toman(5_200_000));
});

test("halves in words are understood", () => {
  assert.equal(amountOf("یک و نیم میلیارد"), toman(1_500_000_000));
  assert.equal(amountOf("نیم میلیارد"), toman(500_000_000));
  assert.equal(amountOf("۲ میلیارد و نیم"), toman(2_500_000_000));
  assert.equal(amountOf("سیصد و پنجاه میلیون"), toman(350_000_000));
});

test("car-market shorthand «۷۲۰ تومن» means 720 million Toman, at lower confidence", () => {
  assert.equal(amountOf("۷۲۰ تومن"), toman(720_000_000));
  const [mention] = findAmountMentions("یه ماشین ۸۰۰ تومنی می‌خوام");
  assert.equal(mention?.value, toman(800_000_000));
  assert.equal(mention?.shorthand, true);
  const { slots } = extractSlots("ماشین ۸۰۰ تومنی می‌خوام");
  assert.equal(slots.targetPrice?.value, toman(800_000_000));
  assert.ok((slots.targetPrice?.provenance.confidence ?? 1) < 0.9);
});

test("dates, model names and an unrelated «و» never become money", () => {
  assert.equal(findAmountMentions("تاریخ ۱۴۰۵/۰۸/۱۷").length, 0);
  assert.equal(findAmountMentions("پژو ۲۰۷ قسطی با چک").length, 0);
  assert.equal(amountOf("۴۰۰ میلیون و دو تا چک"), toman(400_000_000));
});

test("a car sentence yields price and cash, not a fabricated loan request", () => {
  const { slots } = extractSlots("می‌خوام یه ماشین ۸۰۰ میلیونی قسطی بخرم، ۴۰۰ میلیون نقد دارم");
  assert.equal(slots.purpose?.value, "car");
  assert.equal(slots.targetPrice?.value, toman(800_000_000));
  assert.equal(slots.availableCapital?.value, toman(400_000_000));
  assert.equal(slots.amount, undefined);
});

test("down payment phrasing becomes the spending budget", () => {
  const { slots } = extractSlots("پیش پرداخت ۶۰۰ میلیون، قیمت ماشین ۱ میلیارد و ۲۰۰");
  assert.equal(slots.spendingBudget?.value, toman(600_000_000));
  assert.equal(slots.targetPrice?.value, toman(1_200_000_000));
});

test("car needs route to the Vehicle vertical, household machines do not", () => {
  for (const text of [
    "پژو ۲۰۷ قسطی با چک می‌خوام",
    "۲۰۰ میلیون وام برای ماشین می‌خوام",
    "می‌خوام یه ماشین ۸۰۰ میلیونی قسطی بخرم",
    "تویوتا کرولا اقساطی",
  ]) {
    const { slots } = extractSlots(text);
    assert.equal(universalNeedFromText(text, slots).kind, "purchase_vehicle", text);
  }
  const washer = "ماشین لباسشویی قسطی بخرم";
  const { slots } = extractSlots(washer);
  assert.notEqual(slots.purpose?.value, "car");
  assert.notEqual(universalNeedFromText(washer, slots).kind, "purchase_vehicle");
  assert.equal(universalNeedFromText("وام ماشین آلات صنعتی", {}).kind, "equipment");
});
