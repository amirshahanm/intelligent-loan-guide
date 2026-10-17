import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractSlots } from "./extract";
import { purchaseBudget } from "./purchase-budget";
import { fact, userStated } from "./types";
import { universalNeedFromText } from "./universal-need-extract";

test("money held is never interpreted as requested financing", () => {
  const { slots } = extractSlots("من یک میلیارد تومان دارم می‌خواهم ماشین بخرم");
  assert.equal(slots.availableCapital?.value, 10_000_000_000);
  assert.equal(slots.amount, undefined);
});

test("distinct labelled amounts remain distinct, including Persian digits", () => {
  const { slots } = extractSlots(
    "سرمایه موجود ۱ میلیارد تومان، بودجه خرید ۷۰۰ میلیون تومان، قیمت ۲ میلیارد تومان، وام ۳۰۰ میلیون تومان",
  );
  assert.equal(slots.availableCapital?.value, 10_000_000_000);
  assert.equal(slots.spendingBudget?.value, 7_000_000_000);
  assert.equal(slots.targetPrice?.value, 20_000_000_000);
  assert.equal(slots.amount?.value, 3_000_000_000);
  assert.equal(purchaseBudget(slots).status, "calculated");
});

test("unlabelled multiple amounts cannot become a fabricated loan request", () => {
  assert.equal(extractSlots("۱ میلیارد تومان یا ۲ میلیارد تومان").slots.amount, undefined);
});

test("gap calculation does not consume all capital or create eligibility", () => {
  const stated = (value: number) => fact(value, userStated(1));
  const result = purchaseBudget({
    availableCapital: stated(1000),
    spendingBudget: stated(700),
    targetPrice: stated(2000),
  });
  assert.deepEqual(result, {
    status: "calculated",
    fundingGapIrr: 1300,
    retainedCapitalIrr: 300,
    source: "user_stated_arithmetic",
  });
  assert.equal("approved" in result, false);
  assert.equal(purchaseBudget({ availableCapital: stated(1000) }).status, "incomplete");
  assert.equal(
    purchaseBudget({ availableCapital: stated(1000), spendingBudget: stated(1100) }).status,
    "conflict",
  );
});

test("cash-covered targets retain a zero gap, never a negative loan", () => {
  const stated = (value: number) => fact(value, userStated(1));
  const result = purchaseBudget({ spendingBudget: stated(1000), targetPrice: stated(700) });
  assert.equal(result.status === "calculated" && result.fundingGapIrr, 0);
});

test("monthly capacity never swallows the following target price", () => {
  const { slots } = extractSlots("توان پرداخت ماهانه ۳۰ میلیون تومان، قیمت ۲ میلیارد تومان");
  assert.equal(slots.monthlyPaymentCapacity?.value, 300_000_000);
  assert.equal(slots.targetPrice?.value, 20_000_000_000);
});

test("an existing loan and negative money cannot become purchasing capital", () => {
  const existing = extractSlots("وام ۳۰۰ میلیون تومان دارم").slots;
  assert.equal(existing.availableCapital, undefined);
  assert.equal(existing.amount, undefined);
  assert.equal(extractSlots("بودجه خرید -۳۰۰ میلیون تومان").slots.spendingBudget, undefined);
  assert.equal(extractSlots("-۳۰۰ میلیون تومان").slots.amount, undefined);
});

test("purchase target and loan request keep distinct meanings in route extraction", () => {
  const slots = { targetPrice: fact(2000, userStated(1)), amount: fact(300, userStated(1)) };
  assert.equal(universalNeedFromText("می‌خواهم ماشین بخرم", slots).targetAmount, 2000);
  assert.equal(universalNeedFromText("وام لازم دارم", slots).targetAmount, 300);
});
