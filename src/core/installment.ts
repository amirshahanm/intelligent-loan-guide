/**
 * Deterministic installment arithmetic.
 *
 * AUTHORITY: everything here is plain, auditable arithmetic on stated inputs
 * and published partner terms. It never decides eligibility, never invents a
 * rate and never implies approval. All money is integer IRR.
 */

import type { IRR } from "./types";

/** Standard amortized (declining-balance) monthly payment. */
export function amortizedMonthlyPayment(
  principalIrr: IRR,
  annualRatePercent: number,
  months: number,
): IRR {
  if (!Number.isSafeInteger(principalIrr) || principalIrr <= 0) return 0;
  if (!Number.isInteger(months) || months <= 0) return 0;
  const r = annualRatePercent / 100 / 12;
  if (!(r > 0)) return Math.ceil(principalIrr / months);
  const factor = Math.pow(1 + r, months);
  return Math.round((principalIrr * r * factor) / (factor - 1));
}

export type GuaranteeKind = "sayad_cheque" | "promissory_note";

/**
 * Dealer (direct seller) installment terms. These are published by the
 * partner and carry their own provenance; this module only applies them.
 */
export type DealerInstallmentTerms = {
  partnerId: string;
  /** Minimum down payment as a whole percent of the price, e.g. 50. */
  minDownPaymentPercent: number;
  minMonths: number;
  maxMonths: number;
  /**
   * Monthly profit in basis points (450 = 4.5% per month), charged on the
   * financed remainder for every month of the term (flat method).
   */
  monthlyProfitBasisPoints: number;
  method: "flat_on_financed";
  guarantees: GuaranteeKind[];
  /** The promissory note amount is agreed case by case, never computed here. */
  promissoryNoteAmount: "negotiable";
  guarantorRequired: boolean;
  source: { kind: "partner_published"; statedBy: string; asOf: string };
};

export type DealerInstallmentInput = {
  priceIrr: IRR;
  downPaymentIrr: IRR;
  months: number;
};

export type DealerInstallmentResult =
  | {
      status: "calculated";
      priceIrr: IRR;
      downPaymentIrr: IRR;
      /** Down payment share of the price, in basis points (5000 = 50%). */
      downPaymentBasisPoints: number;
      financedIrr: IRR;
      profitIrr: IRR;
      /** Financed remainder plus profit: the sum of all installments. */
      installmentsTotalIrr: IRR;
      /** Down payment plus all installments. */
      grandTotalIrr: IRR;
      months: number;
      /** Equal installments rounded down to whole Toman; the last absorbs the rest. */
      installmentIrr: IRR;
      lastInstallmentIrr: IRR;
      schedule: IRR[];
      guarantees: GuaranteeKind[];
      guarantorRequired: boolean;
      partnerId: string;
      method: "flat_on_financed";
      monthlyProfitBasisPoints: number;
    }
  | { status: "invalid_input" }
  | { status: "down_payment_below_minimum"; minimumDownPaymentIrr: IRR }
  | { status: "down_payment_covers_price" }
  | { status: "months_out_of_range"; minMonths: number; maxMonths: number };

const IRR_PER_TOMAN = 10;

/** Smallest down payment the terms allow for a price, rounded up to whole Toman. */
export function minimumDownPayment(priceIrr: IRR, terms: DealerInstallmentTerms): IRR {
  const raw = Math.ceil((priceIrr * terms.minDownPaymentPercent) / 100);
  return Math.ceil(raw / IRR_PER_TOMAN) * IRR_PER_TOMAN;
}

export function computeDealerInstallment(
  input: DealerInstallmentInput,
  terms: DealerInstallmentTerms,
): DealerInstallmentResult {
  const { priceIrr, downPaymentIrr, months } = input;
  if (
    !Number.isSafeInteger(priceIrr) ||
    !Number.isSafeInteger(downPaymentIrr) ||
    priceIrr <= 0 ||
    downPaymentIrr < 0
  ) {
    return { status: "invalid_input" };
  }
  if (!Number.isInteger(months) || months < terms.minMonths || months > terms.maxMonths) {
    return {
      status: "months_out_of_range",
      minMonths: terms.minMonths,
      maxMonths: terms.maxMonths,
    };
  }
  if (downPaymentIrr >= priceIrr) return { status: "down_payment_covers_price" };
  const minimumDownPaymentIrr = minimumDownPayment(priceIrr, terms);
  if (downPaymentIrr < minimumDownPaymentIrr) {
    return { status: "down_payment_below_minimum", minimumDownPaymentIrr };
  }

  const financedIrr = priceIrr - downPaymentIrr;
  // financed × bp × months / 10,000, rounded to the nearest whole Toman.
  const profitRaw = (financedIrr * terms.monthlyProfitBasisPoints * months) / 10_000;
  if (!Number.isSafeInteger(Math.round(profitRaw))) return { status: "invalid_input" };
  const profitIrr = Math.round(profitRaw / IRR_PER_TOMAN) * IRR_PER_TOMAN;
  const installmentsTotalIrr = financedIrr + profitIrr;

  const installmentIrr = Math.floor(installmentsTotalIrr / months / IRR_PER_TOMAN) * IRR_PER_TOMAN;
  const lastInstallmentIrr = installmentsTotalIrr - installmentIrr * (months - 1);
  const schedule = Array.from({ length: months }, (_, i) =>
    i === months - 1 ? lastInstallmentIrr : installmentIrr,
  );

  return {
    status: "calculated",
    priceIrr,
    downPaymentIrr,
    downPaymentBasisPoints: Math.round((downPaymentIrr * 10_000) / priceIrr),
    financedIrr,
    profitIrr,
    installmentsTotalIrr,
    grandTotalIrr: downPaymentIrr + installmentsTotalIrr,
    months,
    installmentIrr,
    lastInstallmentIrr,
    schedule,
    guarantees: [...terms.guarantees],
    guarantorRequired: terms.guarantorRequired,
    partnerId: terms.partnerId,
    method: terms.method,
    monthlyProfitBasisPoints: terms.monthlyProfitBasisPoints,
  };
}
