import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  CalendarClock,
  PieChart,
  Clock3,
  Network,
  Search,
  ArrowLeft,
  Fingerprint,
  FolderOpen,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CreditJourney } from "@/features/credit/credit-journey";
import { useSession } from "@/lib/session";
import { toDisplayDigits } from "@/lib/money";

export const Route = createFileRoute("/credit")({
  head: () => ({
    meta: [
      { title: "اعتبارسنجی — تسهیل‌رادار" },
      {
        name: "description",
        content:
          "پرونده‌ات را از نگاه یک وام‌دهنده ببین: سیگنال اعتباری، ظرفیت تخمینی و توضیح ساده از آنچه مسیرها را باز یا بسته نگه داشته.",
      },
      { property: "og:title", content: "اعتبارسنجی تسهیل‌رادار" },
      {
        property: "og:description",
        content: "سیگنال اعتباری، ظرفیت تخمینی و توضیح شفاف از وضعیت پرونده.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreditPage,
});

function CreditPage() {
  const { state } = useSession();
  const result = state.creditResult;
  return (
    <AppShell className="credit-service-page">
      <header className="credit-service-hero">
        <h1>اعتبارسنجی + کد سخا</h1>
        <p>تصویر کامل‌تری از اعتبار و آمادگی مالی شما</p>
      </header>

      <section
        className="credit-service-panel credit-summary"
        aria-labelledby="credit-summary-title"
      >
        <div className="credit-summary__copy">
          <h2 id="credit-summary-title">
            <ShieldCheck aria-hidden="true" />
            اعتبارسنجی
          </h2>
          <p>
            {result
              ? `زمان دریافت نتیجه: ${new Date(result.asOf).toLocaleDateString("fa-IR-u-nu-latn")}`
              : "هنوز نتیجهٔ اعتبارسنجی دریافت نشده است."}
          </p>
          <div className="credit-summary__facts">
            <div>
              <span>منبع نتیجه</span>
              <strong>
                {result
                  ? result.demo
                    ? "آزمایشی — دادهٔ واقعی نیست"
                    : "پاسخ سرویس"
                  : "در انتظار بررسی"}
              </strong>
            </div>
            <div>
              <span>سیگنال اعتباری</span>
              <strong>{result ? toDisplayDigits(result.signal) : "دریافت نشده"}</strong>
            </div>
          </div>
          <p>
            {result
              ? "جزئیات و منبع این نتیجه را در مراحل اعتبارسنجی ببین."
              : "برای بررسی، مراحل رضایت و وضعیت سرویس را باز کن. امتیاز یا کلاس اعتباری پیش از دریافت پاسخ نمایش داده نمی‌شود."}
          </p>
          <a href="#credit-process">
            دیدن مراحل اعتبارسنجی
            <ArrowLeft aria-hidden="true" />
          </a>
        </div>
        <div
          className="credit-summary__dial"
          aria-label={
            result ? "نتیجهٔ موجود؛ جزئیات در مراحل اعتبارسنجی" : "هنوز نتیجه‌ای دریافت نشده"
          }
        >
          <svg viewBox="0 0 260 260" aria-hidden="true">
            {[90, 108, 124].map((radius) => (
              <circle
                key={radius}
                cx="130"
                cy="130"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeOpacity={radius === 108 ? ".55" : ".2"}
                strokeWidth={radius === 108 ? 8 : 1}
                strokeDasharray={radius === 108 ? "3 7" : undefined}
              />
            ))}
            <path d="M0 130h260M130 0v260" stroke="currentColor" strokeOpacity=".1" />
          </svg>
          <div>
            <span>{result?.demo ? "نتیجهٔ آزمایشی" : "آمادگی مالی"}</span>
            <strong>{result ? toDisplayDigits(result.signal) : "—"}</strong>
            <small>{result ? "جزئیات نیازمند بررسی" : "در انتظار داده"}</small>
          </div>
        </div>
      </section>

      <section
        className="credit-service-panel credit-factors"
        aria-labelledby="credit-factors-title"
      >
        <h2 id="credit-factors-title">عوامل مؤثر بر امتیاز شما</h2>
        <div>
          {[
            ["سابقه پرداخت", CalendarClock],
            ["استفاده از اعتبار", PieChart],
            ["سابقه اعتباری", Clock3],
            ["تنوع اعتباری", Network],
            ["استعلام‌های اخیر", Search],
          ].map(([label, Icon]) => {
            const FactorIcon = Icon as typeof Search;
            return (
              <article key={String(label)}>
                <FactorIcon aria-hidden="true" />
                <h3>{String(label)}</h3>
                <span>جزئیات دریافت نشده</span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="credit-service-panel credit-sakha" aria-labelledby="credit-sakha-title">
        <div>
          <h2 id="credit-sakha-title">
            <ShieldCheck aria-hidden="true" />
            کد سخا
          </h2>
          <p>اتصال سرویس کد سخا هنوز فراهم نیست.</p>
          <div className="credit-sakha__value">
            <Fingerprint aria-hidden="true" />
            <span>کدی دریافت یا ذخیره نشده است</span>
          </div>
          <p className="credit-sakha__status">وضعیت سرویس: در انتظار اتصال</p>
        </div>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="88" />
          <circle cx="100" cy="100" r="67" />
          <path d="M100 47l46 27v52l-46 27-46-27V74zM54 74l46 27 46-27M100 101v52" />
        </svg>
      </section>

      <section className="credit-service-panel credit-next" aria-labelledby="credit-next-title">
        <h2 id="credit-next-title">گام‌های بعدی پیشنهادی</h2>
        <Link to="/profile">
          <FolderOpen aria-hidden="true" />
          <span>
            <strong>بررسی اطلاعات پرونده</strong>
            <small>اطلاعاتی را که خودت ثبت کرده‌ای مرور و تکمیل کن.</small>
          </span>
          <ArrowLeft aria-hidden="true" />
        </Link>
        <a href="#credit-process">
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>دیدن وضعیت اعتبارسنجی</strong>
            <small>مراحل رضایت، وضعیت سرویس و منبع نتیجه را ببین.</small>
          </span>
          <ArrowLeft aria-hidden="true" />
        </a>
        <Link to="/opportunities">
          <Network aria-hidden="true" />
          <span>
            <strong>بررسی مسیرهای موجود</strong>
            <small>نتیجه و محدودیت‌های هر مسیر در صفحهٔ فرصت‌ها نمایش داده می‌شود.</small>
          </span>
          <ArrowLeft aria-hidden="true" />
        </Link>
      </section>

      <details id="credit-process" className="credit-service-panel credit-process">
        <summary>بازکردن مراحل اعتبارسنجی</summary>
        <div className="credit-process__content">
          <CreditJourney />
        </div>
      </details>
    </AppShell>
  );
}
