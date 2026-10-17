import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ClipboardList, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConciergeExperience } from "@/features/concierge/concierge-experience";
import { FINANCE_SERVICES, isFinanceServiceId } from "@/features/home/finance-services";
import { PopularServiceArt } from "@/features/home/popular-service-art";

export const Route = createFileRoute("/finance/$service")({
  beforeLoad: ({ params }) => {
    if (!isFinanceServiceId(params.service)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `${isFinanceServiceId(params.service) ? FINANCE_SERVICES[params.service].title : "خدمت یافت نشد"} — تسهیل‌رادار`,
      },
    ],
  }),
  component: FinanceServicePage,
  notFoundComponent: () => (
    <AppShell className="service-world">
      <section className="surface-panel">
        <h1>این خدمت پیدا نشد</h1>
        <p>از خانه یکی از خدمات موجود را انتخاب کن.</p>
        <Link to="/" className="service-world__link">
          بازگشت به خانه ←
        </Link>
      </section>
    </AppShell>
  ),
});

function FinanceServicePage() {
  const { service } = Route.useParams();
  if (!isFinanceServiceId(service)) return null;
  return <FinanceContent key={service} service={service} />;
}

function FinanceContent({ service }: { service: keyof typeof FINANCE_SERVICES }) {
  const content = FINANCE_SERVICES[service];
  const [purpose, setPurpose] = useState<string>(content.purposes[0]);
  return (
    <AppShell className="service-world finance-service">
      <header className="finance-service__hero">
        <div>
          <h1>{content.title}</h1>
          <p>{content.subtitle}</p>
          <span className="finance-service__status">
            <ShieldCheck aria-hidden="true" />
            شرح نیاز در دسترس · پیشنهاد واقعی وابسته به اتصال
          </span>
        </div>
        <div className="finance-service__art">
          <PopularServiceArt id={service} />
        </div>
      </header>
      <section aria-labelledby="finance-purpose">
        <h2 id="finance-purpose">هدف تو از این مسیر</h2>
        <div className="finance-service__choices">
          {content.purposes.map((label) => (
            <button
              type="button"
              key={label}
              aria-pressed={purpose === label}
              onClick={() => setPurpose(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      <section className="surface-panel" aria-labelledby="finance-requirements">
        <h2 id="finance-requirements">
          <ClipboardList aria-hidden="true" />
          برای روشن‌شدن مسیر
        </h2>
        <ul className="finance-service__requirements">
          {content.questions.map((question) => (
            <li key={question}>
              <span aria-hidden="true">◇</span>
              {question}
            </li>
          ))}
        </ul>
        <p>
          این‌ها موضوعات بررسی‌اند، نه فهرست قطعی مدارک یا شرط تأیید. اطلاعات نامشخص به معنی ردشدن
          نیست.
        </p>
      </section>
      <section className="surface-panel" aria-labelledby="finance-start">
        <h2 id="finance-start">نیازت را با زبان خودت بگو</h2>
        <p>
          هدف انتخاب‌شده: {purpose}. انتخاب تو فقط با اقدام خودت به متن قابل‌ویرایش منتقل می‌شود؛
          درخواست وام یا سفارش خرید خودکار ثبت نمی‌شود.
        </p>
        <ConciergeExperience
          suggestedNeed={`${content.need} هدف من ${purpose} است.`}
          suggestionLabel="استفاده از هدف انتخاب‌شده در متن نیاز"
        />
      </section>
      <section className="surface-panel" aria-labelledby="finance-next">
        <h2 id="finance-next">وضعیت و قدم بعدی</h2>
        <p>
          {content.dependency} تا دریافت شواهد، سقف، نرخ، قسط یا نتیجهٔ تأیید نمایش داده نمی‌شود.
        </p>
        <div className="finance-service__next">
          <Link to="/opportunities" className="service-world__link">
            دیدن وضعیت فرصت‌ها <ArrowLeft aria-hidden="true" />
          </Link>
          <Link to="/profile" className="service-world__link">
            دیدن پروندهٔ من <ArrowLeft aria-hidden="true" />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
