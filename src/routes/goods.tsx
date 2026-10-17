import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calculator,
  Car,
  ClipboardList,
  Laptop,
  Armchair,
  Smartphone,
  WashingMachine,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConciergeExperience } from "@/features/concierge/concierge-experience";
import { formatToman, fromToman, toDisplayDigits } from "@/lib/money";

export const Route = createFileRoute("/goods")({
  head: () => ({
    meta: [
      { title: "وام کالا — تسهیل‌رادار" },
      {
        name: "description",
        content:
          "شرح نیاز خرید کالا و محاسبهٔ آموزشی اصل مبلغ؛ بدون وعدهٔ اعتبار یا پیشنهاد تأییدنشده.",
      },
    ],
  }),
  component: GoodsPage,
});

const CATEGORIES = [
  { label: "لوازم دیجیتال", Icon: Laptop },
  { label: "لوازم خانگی", Icon: WashingMachine },
  { label: "موبایل و تبلت", Icon: Smartphone },
  { label: "لوازم اداری", Icon: Armchair },
  { label: "خودرو", Icon: Car },
];

function GoodsPage() {
  const [category, setCategory] = React.useState(CATEGORIES[0].label);
  const [amount, setAmount] = React.useState("");
  const [months, setMonths] = React.useState(24);
  const amountNumber = Number(amount);
  const validAmount =
    amount !== "" &&
    Number.isSafeInteger(amountNumber) &&
    amountNumber > 0 &&
    amountNumber <= 1_000_000_000_000;
  const monthlyPrincipal = validAmount ? Math.ceil(fromToman(amountNumber) / months) : null;

  return (
    <AppShell className="goods-page">
      <header className="goods-hero">
        <div className="goods-hero__copy">
          <span className="goods-eyebrow">وام کالا</span>
          <h1>
            تسهیلات <span>خرید کالا</span>
          </h1>
          <p>
            مسیرهای هوشمند تأمین مالی برای خرید کالا و پرداخت نقدی یا اقساطی، متناسب با شرایط شما.
          </p>
        </div>
        <GoodsIllustration />
      </header>

      <div className="goods-benefits" aria-label="دامنه و وضعیت خدمت">
        <span>
          <ShoppingCart aria-hidden="true" />
          خرید نقدی یا اقساطی
        </span>
        <span>
          <ShieldCheck aria-hidden="true" />
          شرایط ضامن وابسته به مسیر
        </span>
        <span>
          <ArrowLeft aria-hidden="true" />
          نیازمند اتصال تأمین‌کننده
        </span>
        <span>
          <Armchair aria-hidden="true" />
          افراد و کسب‌وکارها
        </span>
      </div>

      <section className="goods-panel goods-route" aria-labelledby="goods-route-title">
        <h2 id="goods-route-title">
          <Laptop aria-hidden="true" />
          مسیر پیشنهادی شما
        </h2>
        <div className="goods-route__layout">
          <div className="goods-route__status">
            <ShieldCheck aria-hidden="true" />
            <span>هنوز ارزیابی نشده</span>
          </div>
          <div>
            <h3>خرید {category}</h3>
            <div className="goods-route__facts">
              <div>
                <span>سقف تسهیلات</span>
                <strong>نیازمند پیشنهاد معتبر</strong>
              </div>
              <div>
                <span>مدت بازپرداخت</span>
                <strong>هنوز مشخص نیست</strong>
              </div>
              <div>
                <span>پیش‌پرداخت</span>
                <strong>وابسته به مسیر</strong>
              </div>
            </div>
            <p>
              درصد تطابق، شرایط اعتبار و موجودی فروشنده بدون شواهد تأییدشده نمایش داده نمی‌شوند.
            </p>
            <a href="#goods-start">
              شرح نیاز و بررسی مسیر
              <ArrowLeft aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="goods-panel" aria-labelledby="goods-calculator-title">
        <h2 id="goods-calculator-title">
          <Calculator aria-hidden="true" />
          شبیه‌ساز اقساط
        </h2>
        <p>
          محاسبهٔ آموزشی تقسیم اصل مبلغ؛ بدون سود، کارمزد، بیمه یا هزینهٔ جانبی. این عدد قسط واقعی
          یا پیشنهاد تأمین‌کننده نیست.
        </p>
        <div className="goods-calculator">
          <div className="goods-calculator__fields">
            <label htmlFor="goods-amount">مبلغ موردنظر شما — تومان</label>
            <input
              id="goods-amount"
              type="number"
              inputMode="numeric"
              min="1"
              max="1000000000000"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="مبلغ دلخواه را وارد کنید"
              aria-describedby="goods-amount-note"
              aria-invalid={amount !== "" && !validAmount}
            />
            <small id="goods-amount-note">
              ورودی شخصی؛ هیچ سقف اعتباری از این مبلغ نتیجه‌گیری نمی‌شود.
            </small>
            {amount !== "" && !validAmount ? (
              <p role="alert">
                یک مبلغ صحیح مثبت تا یک تریلیون تومان وارد کن؛ این محدودیت فقط فنی است.
              </p>
            ) : null}
            <label htmlFor="goods-months">مدت فرضی بازپرداخت: {toDisplayDigits(months)} ماه</label>
            <input
              id="goods-months"
              type="range"
              min="1"
              max="60"
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              aria-valuetext={`${toDisplayDigits(months)} ماه، انتخاب آموزشی`}
            />
          </div>
          <output className="goods-calculator__output" aria-live="polite">
            <span>سهم ماهانه از اصل مبلغ — آموزشی</span>
            <strong>
              {monthlyPrincipal === null ? "مبلغ را وارد کن" : formatToman(monthlyPrincipal)}
            </strong>
            <small>اصل مبلغ ÷ تعداد ماه‌ها؛ گرد کردن رو به بالا</small>
          </output>
        </div>
      </section>

      <section className="goods-panel" aria-labelledby="goods-documents-title">
        <h2 id="goods-documents-title">
          <ClipboardList aria-hidden="true" />
          مدارک و شرایط کلی
        </h2>
        <div className="goods-documents">
          <span>مدارک هویتی</span>
          <span>مدارک درآمد</span>
          <span>چک یا سفته، در صورت نیاز مسیر</span>
          <span>اعتبارسنجی با رضایت شما</span>
        </div>
        <p>
          این‌ها دسته‌های احتمالی مدارک‌اند، نه الزامات قطعی. فهرست نهایی فقط پس از مشخص‌شدن مسیر
          معتبر اعلام می‌شود.
        </p>
      </section>

      <section className="goods-panel" aria-labelledby="goods-categories-title">
        <h2 id="goods-categories-title">
          <ShoppingCart aria-hidden="true" />
          دسته‌های کالایی تحت پوشش
        </h2>
        <p className="goods-category-note">
          دسته‌های قابل شرح نیاز؛ انتخاب دسته به معنی پوشش فعال فروشنده نیست.
        </p>
        <div className="goods-categories">
          {CATEGORIES.map(({ label, Icon }) => (
            <button
              key={label}
              type="button"
              aria-pressed={category === label}
              onClick={() => setCategory(label)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <a href="#goods-start" className="goods-continue">
        ادامه و مشاهده بهترین مسیرهای خرید کالا
        <ArrowLeft aria-hidden="true" />
      </a>
      <section
        id="goods-start"
        className="goods-panel goods-start"
        aria-labelledby="goods-start-title"
      >
        <h2 id="goods-start-title">نیازت را با زبان خودت بگو</h2>
        <p>
          انتخاب‌ها فقط با اقدام تو به متن قابل‌ویرایش منتقل می‌شوند؛ محاسبهٔ آموزشی به نتیجهٔ مالی
          تبدیل نمی‌شود.
        </p>
        <ConciergeExperience
          suggestionLabel="استفاده از انتخاب‌های کالا در متن نیاز"
          suggestedNeed={`می‌خواهم ${category} اقساطی بخرم.${validAmount ? ` مبلغ موردنظر من ${toDisplayDigits(amountNumber)} تومان است.` : ""}`}
        />
      </section>
    </AppShell>
  );
}

function GoodsIllustration() {
  return (
    <svg className="goods-illustration" viewBox="0 0 420 320" aria-hidden="true">
      <defs>
        <linearGradient id="goods-metal" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#123d52" />
          <stop offset=".5" stopColor="#051827" />
          <stop offset="1" stopColor="#176679" />
        </linearGradient>
        <radialGradient id="goods-glow">
          <stop stopColor="#00dfdf" stopOpacity=".3" />
          <stop offset="1" stopColor="#00dfdf" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="210" cy="270" rx="195" ry="42" fill="url(#goods-glow)" />
      {[100, 125, 150].map((radius) => (
        <circle
          key={radius}
          cx="210"
          cy="160"
          r={radius}
          fill="none"
          stroke="#00bbc9"
          strokeOpacity=".15"
        />
      ))}
      <g fill="url(#goods-metal)" stroke="#20d6e5" strokeWidth="1.5">
        <path d="M135 55l83-8 27 11v204l-110 6z" />
        <path d="M218 47v210l27 5M135 139l83-4 27 5" fill="none" />
        <path d="M200 86v37m0 37v45" strokeWidth="4" />
        <rect x="219" y="139" width="108" height="132" rx="7" />
        <path d="M219 165h108" />
        <circle cx="273" cy="213" r="36" />
        <circle cx="273" cy="213" r="26" fill="#061825" />
        <rect x="232" y="148" width="20" height="8" rx="2" />
        <circle cx="267" cy="152" r="4" />
        <path d="M281 149h32M281 154h32" />
        <path d="M65 178h95l-8 75H55z" />
        <path d="M55 253h98l25 17H25z" />
        <path d="M71 184h81l-6 60H64z" fill="#041521" />
        <rect x="333" y="193" width="40" height="79" rx="5" />
        <path d="M345 199h16" />
        <circle cx="353" cy="264" r="2" />
      </g>
      <ellipse
        cx="208"
        cy="276"
        rx="190"
        ry="20"
        fill="none"
        stroke="#00becd"
        strokeOpacity=".65"
      />
      <g fill="#7cffff">
        <circle cx="100" cy="76" r="2" />
        <circle cx="344" cy="93" r="2" />
        <circle cx="181" cy="57" r="2" />
      </g>
    </svg>
  );
}
