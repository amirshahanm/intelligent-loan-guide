import * as React from "react";
import { Calculator } from "lucide-react";
import { amortizedMonthlyPayment } from "@/core/installment";
import { parsePriceInput } from "@/features/vehicle/dealer-installment-calculator";
import { formatToman, toDisplayDigits, toLatinDigits } from "@/lib/money";

/**
 * Loan payment calculator. The annual rate is whatever the lender stated to
 * the user; TashilRadar never supplies or implies a rate here.
 */
export function LoanCalculator({ idPrefix = "loan" }: { idPrefix?: string }) {
  const [amountText, setAmountText] = React.useState("");
  const [months, setMonths] = React.useState(24);
  const [rateText, setRateText] = React.useState("");

  const principal = parsePriceInput(amountText);
  const rate = Number(toLatinDigits(rateText.trim()).replace(/[٫/]/, "."));
  const validRate = rateText.trim() !== "" && Number.isFinite(rate) && rate > 0 && rate <= 100;
  const monthly = principal
    ? validRate
      ? amortizedMonthlyPayment(principal, rate, months)
      : Math.ceil(principal / months)
    : null;

  return (
    <section className="goods-panel" aria-labelledby={`${idPrefix}-calc-title`}>
      <h2 id={`${idPrefix}-calc-title`}>
        <Calculator aria-hidden="true" />
        محاسبهٔ قسط وام
      </h2>
      <p>
        مبلغ و مدت را بنویس. اگر بانک یا مؤسسه نرخ سالانه اعلام کرده، آن را هم وارد کن تا قسط
        واقعی‌تر ببینی.
      </p>
      <div className="goods-calculator">
        <div className="goods-calculator__fields">
          <label htmlFor={`${idPrefix}-amount`}>مبلغ وام</label>
          <input
            id={`${idPrefix}-amount`}
            className="loan-calc__input"
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
            placeholder="مثلاً ۲۰۰ میلیون"
            aria-invalid={amountText.trim() !== "" && !principal}
          />
          <small aria-live="polite">
            {principal ? `خوانده شد: ${formatToman(principal)}` : "به عدد یا به زبان خودت بنویس"}
          </small>
          <label htmlFor={`${idPrefix}-months`}>مدت بازپرداخت: {toDisplayDigits(months)} ماه</label>
          <input
            id={`${idPrefix}-months`}
            type="range"
            min="1"
            max="60"
            value={months}
            onChange={(event) => setMonths(Number(event.target.value))}
            aria-valuetext={`${toDisplayDigits(months)} ماه`}
          />
          <label htmlFor={`${idPrefix}-rate`}>نرخ سالانهٔ اعلام‌شده، درصد، اختیاری</label>
          <input
            id={`${idPrefix}-rate`}
            className="loan-calc__input"
            inputMode="decimal"
            value={rateText}
            onChange={(event) => setRateText(event.target.value)}
            placeholder="مثلاً ۲۳"
            aria-invalid={rateText.trim() !== "" && !validRate}
          />
        </div>
        <output className="goods-calculator__output" aria-live="polite">
          <span>{validRate ? "قسط ماهانه با نرخ اعلام‌شده" : "سهم ماهانه از اصل مبلغ"}</span>
          <strong>{monthly === null ? "مبلغ را وارد کن" : formatToman(monthly)}</strong>
          <small>
            {validRate
              ? principal && monthly
                ? `جمع پرداختی ${formatToman(monthly * months)}؛ روش اقساط مساوی بانکی`
                : "روش اقساط مساوی بانکی"
              : "بدون سود؛ برای عدد واقعی‌تر نرخ را وارد کن."}
          </small>
        </output>
      </div>
    </section>
  );
}
