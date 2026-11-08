import * as React from "react";
import { ArrowLeft, BadgeCheck, FileSignature, ReceiptText, ShieldOff } from "lucide-react";
import {
  computeDealerInstallment,
  minimumDownPayment,
  type GuaranteeKind,
} from "@/core/installment";
import { extractAmount } from "@/core/extract";
import {
  SHAHAN_AUTO_INSTALLMENT_TERMS as TERMS,
  SHAHAN_AUTO_PARTNER,
} from "@/lib/partners/shahan-auto";
import { formatToman, formatTomanCompact, toDisplayDigits, toLatinDigits } from "@/lib/money";
import type { IRR } from "@/core/types";

const MONTH_PRESETS = [6, 12, 18, 24].filter((m) => m <= TERMS.maxMonths);

/** Price typed as plain Toman digits or as Persian text («۱/۵ میلیارد», «۸۰۰ تومن»). */
export function parsePriceInput(raw: string): IRR | null {
  const text = raw.trim();
  if (!text) return null;
  const digitsOnly = toLatinDigits(text).replace(/[,٬\s]/g, "");
  if (/^\d+$/.test(digitsOnly)) {
    const toman = Number(digitsOnly);
    // A short bare number is market shorthand for millions («۹۵۰» = 950 million).
    const irr = toman < 100_000 ? toman * 10_000_000 : toman * 10;
    return Number.isSafeInteger(irr) && irr > 0 ? irr : null;
  }
  const parsed = extractAmount(text);
  return parsed && parsed > 0 ? parsed : null;
}

type Props = {
  initialPriceIrr?: IRR | null;
  initialLabel?: string | null;
  onContinue: (summary: string) => void;
};

export function DealerInstallmentCalculator({ initialPriceIrr, initialLabel, onContinue }: Props) {
  const [priceText, setPriceText] = React.useState(() =>
    initialPriceIrr ? toDisplayDigits(Math.round(initialPriceIrr / 10)) : "",
  );
  const [downPercent, setDownPercent] = React.useState(TERMS.minDownPaymentPercent);
  const [months, setMonths] = React.useState(Math.min(24, TERMS.maxMonths));
  const [guarantee, setGuarantee] = React.useState<GuaranteeKind>("sayad_cheque");

  const priceIrr = parsePriceInput(priceText);
  const downPaymentIrr = priceIrr
    ? Math.max(
        minimumDownPayment(priceIrr, TERMS),
        Math.ceil((priceIrr * downPercent) / 100 / 10) * 10,
      )
    : 0;
  const result = priceIrr
    ? computeDealerInstallment({ priceIrr, downPaymentIrr, months }, TERMS)
    : null;
  const calculated = result?.status === "calculated" ? result : null;

  const share = (part: number) =>
    calculated ? `${Math.max(2, (part / calculated.grandTotalIrr) * 100)}%` : "33.3%";

  const continueWith = () => {
    if (!calculated) return;
    onContinue(
      `می‌خواهم خودرو ${formatTomanCompact(calculated.priceIrr).replace(" تومان", "")}ی قسطی بخرم، پیش پرداخت ${formatTomanCompact(calculated.downPaymentIrr)}، ${toDisplayDigits(calculated.months)} ماهه با ${guarantee === "sayad_cheque" ? "چک صیادی" : "سفته"}.`,
    );
  };

  return (
    <section className="dealer-calc" aria-labelledby="dealer-calc-title" id="vehicle-calculator">
      <header className="dealer-calc__head">
        <div>
          <p className="dealer-calc__eyebrow">قسط مستقیم نمایشگاه</p>
          <h2 id="dealer-calc-title">قسط ماشینت را همین الان ببین</h2>
          <p>
            نصف قیمت را نقد بده، باقی را تا {toDisplayDigits(TERMS.maxMonths)} ماه با چک صیادی یا
            سفته. ضامن لازم نیست.
          </p>
        </div>
        <span className="dealer-calc__partner">
          <BadgeCheck aria-hidden="true" />
          شرایط اعلام‌شدهٔ {SHAHAN_AUTO_PARTNER.name}
        </span>
      </header>

      <div className="dealer-calc__body">
        <div className="dealer-calc__fields">
          <div className="dealer-calc__field">
            <label htmlFor="dealer-price">قیمت خودرو</label>
            {initialLabel ? <p className="dealer-calc__listing">{initialLabel}</p> : null}
            <input
              id="dealer-price"
              inputMode="text"
              autoComplete="off"
              value={priceText}
              onChange={(event) => setPriceText(event.target.value)}
              placeholder="مثلاً ۱ میلیارد و ۲۰۰ یا ۹۵۰ تومن"
              aria-describedby="dealer-price-read"
              aria-invalid={priceText.trim() !== "" && !priceIrr}
            />
            <small id="dealer-price-read" aria-live="polite">
              {priceIrr
                ? `خوانده شد: ${formatToman(priceIrr)}`
                : priceText.trim()
                  ? "مبلغ را نفهمیدم؛ مثلاً بنویس ۱ میلیارد و ۲۰۰ میلیون"
                  : "به عدد یا به زبان خودت بنویس"}
            </small>
          </div>

          <div className="dealer-calc__field">
            <label htmlFor="dealer-down">
              پیش‌پرداخت
              <output htmlFor="dealer-down">
                {toDisplayDigits(downPercent)}٪
                {priceIrr ? ` · ${formatTomanCompact(downPaymentIrr)}` : ""}
              </output>
            </label>
            <input
              id="dealer-down"
              type="range"
              min={TERMS.minDownPaymentPercent}
              max={90}
              step={5}
              value={downPercent}
              onChange={(event) => setDownPercent(Number(event.target.value))}
              aria-valuetext={`${toDisplayDigits(downPercent)} درصد`}
            />
            <small>
              حداقل پیش‌پرداخت {toDisplayDigits(TERMS.minDownPaymentPercent)}٪ قیمت است.
            </small>
          </div>

          <div className="dealer-calc__field">
            <span className="dealer-calc__label" id="dealer-months-label">
              تعداد قسط
              <output>{toDisplayDigits(months)} ماه</output>
            </span>
            <div className="dealer-calc__chips" role="group" aria-labelledby="dealer-months-label">
              {MONTH_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={months === m}
                  onClick={() => setMonths(m)}
                >
                  {toDisplayDigits(m)} ماه
                </button>
              ))}
            </div>
            <input
              type="range"
              min={TERMS.minMonths}
              max={TERMS.maxMonths}
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              aria-labelledby="dealer-months-label"
              aria-valuetext={`${toDisplayDigits(months)} ماه`}
            />
          </div>

          <div className="dealer-calc__field">
            <span className="dealer-calc__label" id="dealer-guarantee-label">
              نوع تضمین
            </span>
            <div
              className="dealer-calc__segment"
              role="group"
              aria-labelledby="dealer-guarantee-label"
            >
              <button
                type="button"
                aria-pressed={guarantee === "sayad_cheque"}
                onClick={() => setGuarantee("sayad_cheque")}
              >
                <ReceiptText aria-hidden="true" />
                چک صیادی
              </button>
              <button
                type="button"
                aria-pressed={guarantee === "promissory_note"}
                onClick={() => setGuarantee("promissory_note")}
              >
                <FileSignature aria-hidden="true" />
                سفته
              </button>
            </div>
          </div>
        </div>

        <output className="dealer-calc__result" aria-live="polite" data-ready={Boolean(calculated)}>
          <span className="dealer-calc__result-label">قسط ماهانه</span>
          <strong key={calculated?.installmentIrr ?? "empty"} className="dealer-calc__big">
            {calculated ? formatTomanCompact(calculated.installmentIrr) : "قیمت را وارد کن"}
          </strong>

          <div className="dealer-calc__bar" aria-hidden="true">
            <span className="is-down" style={{ width: share(calculated?.downPaymentIrr ?? 1) }} />
            <span className="is-financed" style={{ width: share(calculated?.financedIrr ?? 1) }} />
            <span className="is-profit" style={{ width: share(calculated?.profitIrr ?? 1) }} />
          </div>

          <dl className="dealer-calc__rows">
            <div>
              <dt>
                <i className="is-down" aria-hidden="true" />
                پیش‌پرداخت نقد
              </dt>
              <dd>{calculated ? formatToman(calculated.downPaymentIrr) : "—"}</dd>
            </div>
            <div>
              <dt>
                <i className="is-financed" aria-hidden="true" />
                باقی‌ماندهٔ قسطی
              </dt>
              <dd>{calculated ? formatToman(calculated.financedIrr) : "—"}</dd>
            </div>
            <div>
              <dt>
                <i className="is-profit" aria-hidden="true" />
                سود {toDisplayDigits(TERMS.monthlyProfitBasisPoints / 100)}٪ ماهانه روی باقی‌مانده
              </dt>
              <dd>{calculated ? formatToman(calculated.profitIrr) : "—"}</dd>
            </div>
            <div className="is-total">
              <dt>جمع کل پرداختی</dt>
              <dd>{calculated ? formatToman(calculated.grandTotalIrr) : "—"}</dd>
            </div>
          </dl>

          <ul className="dealer-calc__terms">
            <li>
              {guarantee === "sayad_cheque" ? (
                <ReceiptText aria-hidden="true" />
              ) : (
                <FileSignature aria-hidden="true" />
              )}
              {guarantee === "sayad_cheque"
                ? calculated
                  ? `${toDisplayDigits(calculated.months)} فقره چک صیادی ماهانه`
                  : "چک صیادی به تعداد قسط‌ها"
                : "مبلغ سفته: توافقی"}
            </li>
            <li>
              <ShieldOff aria-hidden="true" />
              ضامن لازم نیست
            </li>
          </ul>

          {result && result.status !== "calculated" ? (
            <p className="dealer-calc__note" role="alert">
              {result.status === "down_payment_covers_price"
                ? "با این پیش‌پرداخت، کل قیمت نقد پرداخت می‌شود و قسطی نمی‌ماند."
                : "این ترکیب با شرایط اعلام‌شده جور نیست؛ عددها را بررسی کن."}
            </p>
          ) : null}

          <button
            type="button"
            className="dealer-calc__cta"
            disabled={!calculated}
            onClick={continueWith}
          >
            ادامه با همین شرایط
            <ArrowLeft aria-hidden="true" />
          </button>
          <p className="dealer-calc__note">
            محاسبهٔ دقیق بر پایهٔ شرایط اعلام‌شده است؛ قیمت نهایی خودرو، موجودی و قرارداد با
            نمایشگاه قطعی می‌شود. {SHAHAN_AUTO_PARTNER.name} از مجموعهٔ شاهان و همکار تسهیل‌رادار
            است.
          </p>
        </output>
      </div>
    </section>
  );
}
