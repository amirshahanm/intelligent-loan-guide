/**
 * Installment arithmetic self-check. Run: bun run src/core/installment.selfcheck.ts
 */
import { strict as assert } from "node:assert";
import {
  amortizedMonthlyPayment,
  computeDealerInstallment,
  minimumDownPayment,
  type DealerInstallmentTerms,
} from "./installment";
import { SHAHAN_AUTO_INSTALLMENT_TERMS as terms } from "../lib/partners/shahan-auto";

const M = (millionToman: number) => millionToman * 10_000_000;
let checks = 0;
const check = (fn: () => void) => {
  fn();
  checks++;
};

// 1,000M car, 50% down, 24 months at 4.5%/month flat on 500M financed.
check(() => {
  const r = computeDealerInstallment(
    { priceIrr: M(1000), downPaymentIrr: M(500), months: 24 },
    terms,
  );
  assert.equal(r.status, "calculated");
  if (r.status !== "calculated") return;
  assert.equal(r.financedIrr, M(500));
  assert.equal(r.profitIrr, M(540)); // 500 × 4.5% × 24
  assert.equal(r.installmentsTotalIrr, M(1040));
  assert.equal(r.grandTotalIrr, M(1540));
  assert.equal(r.schedule.length, 24);
  assert.equal(
    r.schedule.reduce((a, b) => a + b, 0),
    r.installmentsTotalIrr,
  );
  assert.equal(r.installmentIrr % 10, 0);
  assert.equal(r.downPaymentBasisPoints, 5000);
  assert.equal(r.guarantorRequired, false);
  assert.deepEqual(r.guarantees, ["sayad_cheque", "promissory_note"]);
});

// Schedule always sums exactly, even for awkward amounts.
check(() => {
  const r = computeDealerInstallment(
    { priceIrr: 12_345_678_910, downPaymentIrr: 7_000_000_000, months: 7 },
    terms,
  );
  assert.equal(r.status, "calculated");
  if (r.status !== "calculated") return;
  assert.equal(
    r.schedule.reduce((a, b) => a + b, 0),
    r.installmentsTotalIrr,
  );
  assert.ok(r.lastInstallmentIrr >= r.installmentIrr);
  assert.ok(r.lastInstallmentIrr - r.installmentIrr < 10 * 7);
});

// Guard rails: minimum down payment, term range, invalid and fully-paid inputs.
check(() => {
  const below = computeDealerInstallment(
    { priceIrr: M(1000), downPaymentIrr: M(499), months: 12 },
    terms,
  );
  assert.deepEqual(below, { status: "down_payment_below_minimum", minimumDownPaymentIrr: M(500) });
  assert.equal(
    computeDealerInstallment({ priceIrr: M(1000), downPaymentIrr: M(500), months: 25 }, terms)
      .status,
    "months_out_of_range",
  );
  assert.equal(
    computeDealerInstallment({ priceIrr: M(1000), downPaymentIrr: M(500), months: 0 }, terms)
      .status,
    "months_out_of_range",
  );
  assert.equal(
    computeDealerInstallment({ priceIrr: M(1000), downPaymentIrr: M(1000), months: 6 }, terms)
      .status,
    "down_payment_covers_price",
  );
  assert.equal(
    computeDealerInstallment({ priceIrr: -1, downPaymentIrr: 0, months: 6 }, terms).status,
    "invalid_input",
  );
  assert.equal(
    computeDealerInstallment({ priceIrr: 1.5, downPaymentIrr: 0, months: 6 }, terms).status,
    "invalid_input",
  );
  assert.equal(minimumDownPayment(M(999.99999), terms) % 10, 0);
});

// Larger down payment lowers the profit linearly; the rate is never invented.
check(() => {
  const a = computeDealerInstallment(
    { priceIrr: M(1000), downPaymentIrr: M(600), months: 12 },
    terms,
  );
  assert.equal(a.status === "calculated" && a.profitIrr, M(400 * 0.045 * 12));
  const zeroRate: DealerInstallmentTerms = { ...terms, monthlyProfitBasisPoints: 0 };
  const b = computeDealerInstallment(
    { priceIrr: M(1000), downPaymentIrr: M(500), months: 10 },
    zeroRate,
  );
  assert.equal(b.status === "calculated" && b.installmentIrr, M(50));
});

// Shahan Auto published terms are exactly what the owner stated.
check(() => {
  assert.equal(terms.minDownPaymentPercent, 50);
  assert.equal(terms.maxMonths, 24);
  assert.equal(terms.monthlyProfitBasisPoints, 450);
  assert.equal(terms.guarantorRequired, false);
  assert.equal(terms.promissoryNoteAmount, "negotiable");
  assert.equal("commission" in terms, false);
});

// Amortized payment (bank-style): 1,500M at 25%/yr over 24 months ≈ 80.04M.
check(() => {
  const p = amortizedMonthlyPayment(M(1500), 25, 24);
  assert.equal(p, 800_572_804);
  assert.equal(amortizedMonthlyPayment(M(120), 0, 12), M(10));
  assert.equal(amortizedMonthlyPayment(0, 25, 12), 0);
  assert.equal(amortizedMonthlyPayment(M(100), 25, 0), 0);
});

console.log(`installment self-check passed (${checks} groups, dealer flat + amortized)`);
