import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isAssessmentComplete, nextQuestion } from "./questions";
import { fact, userStated, type IntentSlots } from "./types";

test("a budget alone triggers goal discovery, not an immediate guarantor flow", () => {
  const slots: IntentSlots = { amount: fact(10_000_000_000, userStated(1)) };
  assert.equal(nextQuestion(slots, [])?.id, "q_purpose");
  assert.equal(isAssessmentComplete(slots), false);
});

test("an already stated goal is not asked again", () => {
  const slots: IntentSlots = { purpose: fact("car", userStated(1)) };
  assert.equal(nextQuestion(slots, [])?.id, "q_amount");
});

test("a pending goal question is not duplicated", () => {
  assert.notEqual(nextQuestion({}, ["q_purpose"])?.id, "q_purpose");
});

test("stated capital asks spendable budget before financing questions", () => {
  const slots: IntentSlots = {
    purpose: fact("car", userStated(1)),
    availableCapital: fact(1000, userStated(1)),
  };
  assert.equal(nextQuestion(slots, [])?.id, "q_spending_budget");
});

test("a cash-covered purchase does not ask for a loan or guarantor", () => {
  const stated = (value: number) => fact(value, userStated(1));
  const slots: IntentSlots = {
    purpose: fact("car", userStated(1)),
    availableCapital: stated(1000),
    spendingBudget: stated(700),
    targetPrice: stated(500),
  };
  assert.equal(nextQuestion(slots, []), null);
});

test("purchase capital flows through budget, target, explicit financing and monthly capacity", () => {
  const stated = (value: number) => fact(value, userStated(1));
  const slots: IntentSlots = {
    purpose: fact("car", userStated(1)),
    availableCapital: stated(1000),
  };
  assert.equal(nextQuestion(slots, [])?.id, "q_spending_budget");
  slots.spendingBudget = stated(700);
  assert.equal(nextQuestion(slots, [])?.id, "q_target_price");
  slots.targetPrice = stated(1200);
  assert.equal(nextQuestion(slots, [])?.id, "q_amount");
  assert.match(nextQuestion(slots, [])!.helper!, /خودکار/);
  assert.equal(slots.amount, undefined);
  slots.amount = stated(300);
  assert.equal(nextQuestion(slots, [])?.id, "q_monthly_capacity");
});

test("a zero arithmetic gap cannot complete a business or cash-loan assessment", () => {
  const slots: IntentSlots = {
    purpose: fact("business", userStated(1)),
    spendingBudget: fact(700, userStated(1)),
    targetPrice: fact(500, userStated(1)),
  };
  assert.equal(isAssessmentComplete(slots), false);
  assert.equal(nextQuestion(slots, [])?.id, "q_amount");
});

test("conflicting capital and budget is corrected before any financing question", () => {
  const slots: IntentSlots = {
    purpose: fact("home", userStated(1)),
    availableCapital: fact(500, userStated(1)),
    spendingBudget: fact(700, userStated(1)),
  };
  assert.equal(nextQuestion(slots, ["q_spending_budget"])?.id, "q_spending_budget");
  assert.equal(isAssessmentComplete(slots), false);
});
