import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Landmark, Scale, ShieldCheck, Store, FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ServiceSignal } from "@/components/service-signal";
import { ConciergeExperience } from "@/features/concierge/concierge-experience";

export const Route = createFileRoute("/bank-credit")({
  head: () => ({ meta: [{ title: "خرید و فروش اعتبار بانک‌ها — تسهیل‌رادار" }] }),
  component: BankCreditPage,
});

function BankCreditPage() {
  const [tab, setTab] = useState("بازار / فرصت‌ها");
  const [intent, setIntent] = useState("خرید اعتبار");
  return (
    <AppShell className="service-world">
      <header className="service-world__hero">
        <h1>
          <span>خرید و فروش اعتبار</span> بانک‌ها
        </h1>
        <p>بررسی مسیر، شرایط انتقال و تصمیم بر پایهٔ پیشنهاد معتبر</p>
      </header>
      <section className="surface-panel service-world__overview" aria-labelledby="market-status">
        <div>
          <h2 id="market-status">وضعیت بازار امروز</h2>
          <dl className="service-world__facts">
            {[
              ["حجم معاملات", "دادهٔ زنده دریافت نشده"],
              ["میانگین نرخ فروش", "قابل اعلام نیست"],
              ["زمان تسویه", "نیازمند قرارداد معتبر"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>امکان معامله به ضوابط بانک، قابلیت انتقال و بررسی حقوقی هر مسیر وابسته است.</p>
        </div>
        <ServiceSignal variant="market" />
        <p className="service-world__disclosure">
          نمای تزئینی؛ خوراک زندهٔ بازار یا پیشنهاد قابل معامله متصل نیست.
        </p>
      </section>
      <div className="service-world__tabs" aria-label="بخش اعتبار بانکی">
        {[
          { label: "بازار / فرصت‌ها", Icon: Store },
          { label: "درخواست / مقایسه", Icon: Scale },
        ].map(({ label, Icon }) => (
          <button
            type="button"
            key={label}
            aria-pressed={tab === label}
            onClick={() => setTab(label)}
          >
            <Icon aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {tab === "بازار / فرصت‌ها" ? (
        <section className="surface-panel" aria-labelledby="market-offers">
          <h2 id="market-offers">
            <Landmark aria-hidden="true" />
            فرصت‌های ویژه امروز
          </h2>
          <p>
            هنوز پیشنهاد بانکی معتبر دریافت نشده است. نام بانک، مبلغ، نرخ و زمان تسویه بدون منبع و
            شرایط قابل بررسی نمایش داده نمی‌شوند.
          </p>
          <Link to="/opportunities" className="service-world__link">
            مشاهده وضعیت فرصت‌ها ←
          </Link>
        </section>
      ) : (
        <section className="surface-panel" aria-labelledby="market-compare">
          <h2 id="market-compare">
            <Scale aria-hidden="true" />
            مقایسه هوشمند
          </h2>
          <p>
            برای مقایسه به پیشنهادهای معتبر، شرایط انتقال، هزینه‌های کامل و تاریخ اعتبار نیاز است.
            هنوز پیشنهادی برای انتخاب یا مقایسه وجود ندارد.
          </p>
          <Link to="/profile" className="service-world__link">
            دیدن وضعیت پرونده ←
          </Link>
        </section>
      )}
      <section className="surface-panel" aria-labelledby="market-request">
        <h2 id="market-request">
          <FileText aria-hidden="true" />
          ثبت درخواست خرید یا فروش اعتبار
        </h2>
        <div className="service-world__tabs" aria-label="نوع نیاز">
          {["خرید اعتبار", "فروش اعتبار"].map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={intent === label}
              onClick={() => setIntent(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <p>
          انتخاب تو فقط متن پیش‌نویس را آماده می‌کند؛ ثبت سفارش بازار، انتقال اعتبار، تعهد یا پرداخت
          انجام نمی‌شود.
        </p>
        <ConciergeExperience
          suggestedNeed={`می‌خواهم امکان قانونی ${intent} بانکی و شرایط مسیر را بررسی کنم.`}
          suggestionLabel="آماده‌کردن شرح نیاز اعتباری"
        />
      </section>
      <div className="service-world__insights">
        {[
          {
            Icon: FileText,
            title: "هزینهٔ شفاف",
            text: "هزینه‌ها فقط از پیشنهاد معتبر و با تفکیک منبع نمایش داده می‌شوند.",
          },
          {
            Icon: Clock,
            title: "تسویه و قرارداد",
            text: "زمان و امکان تسویه بدون قرارداد و شریک اجرایی تأیید نمی‌شود.",
          },
          {
            Icon: ShieldCheck,
            title: "بررسی امن مسیر",
            text: "هیچ تضمین پرداخت یا تأیید بانکی بدون شواهد اعلام نمی‌شود.",
          },
        ].map(({ Icon, title, text }) => (
          <article className="surface-panel" key={title}>
            <Icon aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
