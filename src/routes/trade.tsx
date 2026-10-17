import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, Globe2, ShieldCheck, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ServiceSignal } from "@/components/service-signal";
import { ConciergeExperience } from "@/features/concierge/concierge-experience";

export const Route = createFileRoute("/trade")({
  head: () => ({ meta: [{ title: "واردات و صادرات — تسهیل‌رادار" }] }),
  component: TradePage,
});

function TradePage() {
  const [direction, setDirection] = useState("واردات");
  const [category, setCategory] = useState("ماشین‌آلات صنعتی");
  return (
    <AppShell className="service-world">
      <header className="service-world__hero">
        <h1>
          <span>واردات</span> و صادرات
        </h1>
        <p>مسیرهای تجارت، فرصت‌های بازرگانی و تأمین مالی</p>
      </header>
      <section className="surface-panel service-world__overview" aria-labelledby="trade-status">
        <div>
          <h2 id="trade-status">وضعیت مسیرهای فعال</h2>
          <dl className="service-world__facts">
            {[
              ["مسیر واردات", "نیازمند تأمین‌کننده"],
              ["مسیر صادرات", "نیازمند شریک اجرایی"],
              ["تأمین مالی تجارت", "نیازمند پیشنهاد معتبر"],
              ["بررسی مسیر", "با شرح نیاز شما"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <ServiceSignal variant="trade" />
        <p className="service-world__disclosure">
          نمای مسیرها تزئینی است؛ شبکهٔ زنده، تعداد فرصت یا نتیجهٔ ارزیابی را نمایش نمی‌دهد.
        </p>
      </section>
      <div className="service-world__tabs" aria-label="جهت تجارت">
        {[
          { label: "واردات", Icon: ArrowDownToLine },
          { label: "صادرات", Icon: ArrowUpFromLine },
        ].map(({ label, Icon }) => (
          <button
            key={label}
            type="button"
            aria-pressed={direction === label}
            onClick={() => setDirection(label)}
          >
            <Icon aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <section aria-labelledby="trade-paths">
        <h2 id="trade-paths">مسیرهای تجاری پیشنهادی</h2>
        <p className="service-world__muted">
          حوزهٔ نیازت را انتخاب کن؛ این دسته‌ها پیشنهاد تجاری تأییدشده نیستند.
        </p>
        <div className="service-world__carousel">
          {["ماشین‌آلات صنعتی", "قطعات الکترونیکی", "مواد اولیه"].map((label) => (
            <button
              type="button"
              className="surface-panel service-world__card"
              key={label}
              aria-pressed={category === label}
              onClick={() => setCategory(label)}
            >
              <Boxes aria-hidden="true" />
              <h3>{label}</h3>
              <dl>
                <div>
                  <dt>زمان ترخیص</dt>
                  <dd>نیازمند بررسی مسیر</dd>
                </div>
                <div>
                  <dt>حجم تقاضا</dt>
                  <dd>دادهٔ معتبر دریافت نشده</dd>
                </div>
                <div>
                  <dt>فرصت تأمین مالی</dt>
                  <dd>هنوز مشخص نیست</dd>
                </div>
              </dl>
            </button>
          ))}
        </div>
      </section>
      <section className="surface-panel" aria-labelledby="trade-finance">
        <h2 id="trade-finance">
          <Wallet aria-hidden="true" />
          فرصت‌های تأمین مالی تجارت
        </h2>
        <p>
          هنوز پیشنهاد تأمین مالی معتبر و متناسب با این نیاز دریافت نشده است. مبلغ، هزینه و شرایط
          فقط با شواهد قابل بررسی نمایش داده می‌شوند.
        </p>
        <Link to="/opportunities" className="service-world__link">
          دیدن وضعیت فرصت‌ها ←
        </Link>
      </section>
      <section aria-labelledby="trade-insights">
        <h2 id="trade-insights">بینش مسیرها و تأمین‌کنندگان</h2>
        <div className="service-world__insights">
          {[
            {
              Icon: Globe2,
              title: "تأمین‌کنندگان",
              text: "انتخاب شریک نیازمند بررسی هویت، ظرفیت و قرارداد است.",
            },
            {
              Icon: ShieldCheck,
              title: "ریسک مسیر",
              text: "مجوزها، هزینه‌ها و الزامات هر مسیر باید جداگانه بررسی شوند.",
            },
            {
              Icon: Boxes,
              title: "زمان اجرای مسیر",
              text: "برآورد قطعی بدون اطلاعات کالا و مسیر ارائه نمی‌شود.",
            },
          ].map(({ Icon, title, text }) => (
            <article className="surface-panel" key={title}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="trade-start" className="surface-panel">
        <h2>شرح نیاز بازرگانی</h2>
        <p>
          انتخاب فعلی: {direction} {category}. متن فقط با اقدام تو وارد پیش‌نویس می‌شود؛ ارسال
          خودکار یا سفارش واقعی انجام نمی‌شود.
        </p>
        <ConciergeExperience
          suggestedNeed={`برای ${direction} ${category} می‌خواهم مسیر تجاری و تأمین مالی را بررسی کنم.`}
          suggestionLabel="استفاده از انتخاب‌های بازرگانی"
        />
      </section>
    </AppShell>
  );
}
