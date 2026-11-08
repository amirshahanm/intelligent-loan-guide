import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Car,
  ExternalLink,
  Headphones,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react";
import { SUPPORT_CHANNELS, hasSupportChannel } from "@/lib/contact-channels";
import { SHAHAN_AUTO_PARTNER, SHAHAN_AUTO_PUBLIC_URL } from "@/lib/partners/shahan-auto";
import { toDisplayDigits } from "@/lib/money";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "پشتیبانی — تسهیل‌رادار" },
      {
        name: "description",
        content: "راهنمای مسیرهای واقعی پشتیبانی و مدیریت امن پرونده در تسهیل‌رادار.",
      },
      { property: "og:title", content: "پشتیبانی تسهیل‌رادار" },
      {
        property: "og:description",
        content: "مسیرهای امن برای مدیریت پرونده و پیگیری فرصت‌ها.",
      },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <AppShell className="support-page">
      <header className="support-hero">
        <div className="support-hero__mark" aria-hidden="true">
          <Headphones />
          <span />
        </div>
        <div className="min-w-0">
          <span className="support-eyebrow">کنار پروندهٔ تو</span>
          <h1>پشتیبانی</h1>
          <p>برای مدیریت امن پرونده و پیگیری مسیرها، از راه‌های فعال محصول استفاده کن.</p>
        </div>
      </header>

      {hasSupportChannel() ? <SupportChannels /> : null}

      <div className="support-grid">
        <div className="support-route-card support-route-card--live">
          <span className="support-route-card__icon">
            <Car aria-hidden="true" />
          </span>
          <div className="support-route-card__body">
            <span className="support-eyebrow">فعال</span>
            <h2>قسط مستقیم خودرو</h2>
            <p>
              برای دیدن خودروها و هماهنگی خرید قسطی، مستقیم با {SHAHAN_AUTO_PARTNER.name}، همکار
              تسهیل‌رادار، در ارتباط باش.
            </p>
            <a
              href={SHAHAN_AUTO_PUBLIC_URL}
              target="_blank"
              rel="noopener"
              className="support-route-card__action"
            >
              <span>رفتن به {SHAHAN_AUTO_PARTNER.name}</span>
              <ExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>
        <SupportRouteCard
          icon={<Phone aria-hidden="true" />}
          title="ثبت شماره تماس"
          description="شمارهٔ خودت را فقط از مسیر امن پرونده ثبت و مدیریت کن."
          action="رفتن به پروندهٔ من"
          to="/profile"
        />
        <SupportRouteCard
          icon={<ShieldCheck aria-hidden="true" />}
          title="احراز مالکیت پرونده"
          description="اتصال پرونده بعد از تأیید واقعی سرور فعال می‌شود؛ این شناسه به‌تنهایی مجوز دسترسی نیست."
          action="دیدن وضعیت پرونده"
          to="/profile"
        />
        <SupportRouteCard
          icon={<Headphones aria-hidden="true" />}
          title="درخواست بررسی انسانی"
          description="اگر یک فرصت مسیر ارجاع داشته باشد، درخواست بررسی را از صفحهٔ همان فرصت ثبت کن."
          action="دیدن فرصت‌ها"
          to="/opportunities"
        />
        <div
          className="support-route-card support-route-card--disabled"
          aria-labelledby="support-ticket-title"
        >
          <span className="support-route-card__icon">
            <MessageCircle aria-hidden="true" />
          </span>
          <div className="support-route-card__body">
            <span className="support-eyebrow">در حال آماده‌سازی</span>
            <h2 id="support-ticket-title">ثبت تیکت</h2>
            <p>سامانهٔ تیکت هنوز به پاسخ‌گوی پشتیبانی متصل نیست؛ پیامی ارسال نمی‌شود.</p>
            <button type="button" disabled className="support-route-card__action">
              <span>هنوز فعال نیست</span>
              <ArrowLeft aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {hasSupportChannel() ? null : (
        <aside className="support-truth-note" aria-label="وضعیت کانال پشتیبانی">
          <span className="support-truth-note__mark" aria-hidden="true">
            <Headphones />
          </span>
          <p>
            شمارهٔ تماس و ساعت پاسخ‌گویی تأییدشده‌ای برای مرکز پشتیبانی ثبت نشده؛ برای جلوگیری از
            اطلاعات نادرست، اینجا نمایش داده نمی‌شود.
          </p>
        </aside>
      )}
    </AppShell>
  );
}

function SupportRouteCard({
  icon,
  title,
  description,
  action,
  to,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  to: "/profile" | "/opportunities";
}) {
  return (
    <article className="support-route-card">
      <span className="support-route-card__icon">{icon}</span>
      <div className="support-route-card__body">
        <h2>{title}</h2>
        <p>{description}</p>
        <Link to={to} className="support-route-card__action">
          <span>{action}</span>
          <ArrowLeft aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function SupportChannels() {
  const { phone, whatsapp, telegram, bale, hours } = SUPPORT_CHANNELS;
  const links = [
    phone && {
      href: `tel:+${phone}`,
      label: "تماس تلفنی",
      value: toDisplayDigits(`0${phone.slice(2)}`),
      icon: <Phone aria-hidden="true" />,
    },
    whatsapp && {
      href: `https://wa.me/${whatsapp}`,
      label: "واتساپ",
      value: "",
      icon: <MessageCircle aria-hidden="true" />,
    },
    telegram && {
      href: `https://t.me/${telegram}`,
      label: "تلگرام",
      value: "",
      icon: <Send aria-hidden="true" />,
    },
    bale && {
      href: `https://ble.ir/${bale}`,
      label: "بله",
      value: "",
      icon: <Send aria-hidden="true" />,
    },
  ].filter(Boolean) as unknown as { href: string; label: string; value: string; icon: ReactNode }[];
  return (
    <section className="support-channels" aria-labelledby="support-channels-title">
      <h2 id="support-channels-title">با ما حرف بزن</h2>
      {hours ? <p>{hours}</p> : null}
      <div className="support-channels__links">
        {links.map((link) => (
          <a key={link.label} href={link.href} target="_blank" rel="noopener">
            {link.icon}
            <span>{link.label}</span>
            {link.value ? <small>{link.value}</small> : null}
          </a>
        ))}
      </div>
    </section>
  );
}
