import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Car, Landmark, ClipboardList, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConciergeExperience } from "@/features/concierge/concierge-experience";

export const Route = createFileRoute("/vehicle")({
  head: () => ({ meta: [{ title: "خدمات خودرو — تسهیل‌رادار" }] }),
  component: VehiclePage,
});

const TYPES = ["همه سواری‌ها", "هاچ‌بک", "سدان", "شاسی‌بلند", "کراس‌اوور"];
const ORIGINS = ["ایرانی", "خارجی", "وارداتی"];

function VehiclePage() {
  const [vehicleType, setVehicleType] = React.useState(TYPES[0]);
  const [origin, setOrigin] = React.useState<string | null>(null);
  const [path, setPath] = React.useState<"cash" | "installment" | null>(null);

  return (
    <AppShell className="vehicle-page">
      <h1 className="vehicle-page__title">خدمات خودرو</h1>
      <section className="vehicle-hero" aria-labelledby="vehicle-heading">
        <div className="vehicle-hero__copy">
          <p>همه مسیرها برای خرید خودروی دلخواه</p>
          <h2 id="vehicle-heading">
            از <span className="vehicle-gold">نقدی</span> تا <span>اقساط بانکی</span>
          </h2>
          <p>سواری، ایرانی، خارجی، وارداتی</p>
          <div className="vehicle-options" aria-label="مبدأ خودرو">
            {ORIGINS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={origin === item}
                onClick={() => setOrigin(origin === item ? null : item)}
              >
                {item}
              </button>
            ))}
          </div>
          <small>انتخاب‌ها برای شرح نیاز تو هستند؛ تأیید موجودی یا امکان خرید نیستند.</small>
        </div>
        <div className="vehicle-radar" aria-hidden="true">
          <svg viewBox="0 0 320 320">
            <defs>
              <radialGradient id="vehicle-radar-depth">
                <stop stopColor="currentColor" stopOpacity=".14" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="160" cy="160" r="150" fill="url(#vehicle-radar-depth)" />
            {[40, 65, 90, 115, 140].map((radius) => (
              <circle
                key={radius}
                cx="160"
                cy="160"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeOpacity=".25"
              />
            ))}
            <path d="M10 160h300M160 10v300" stroke="currentColor" strokeOpacity=".13" />
          </svg>
          <div className="vehicle-radar__sweep" />
          <Car className="vehicle-radar__center" />
          {[0, 1, 2, 3, 4].map((node) => (
            <Car key={node} className={`vehicle-radar__node vehicle-radar__node--${node}`} />
          ))}
        </div>
      </section>

      <div className="vehicle-paths">
        {(
          [
            [
              "cash",
              "خرید خودرو نقدی",
              Car,
              "برای پیدا کردن مسیر خرید، نیاز و محدودیت‌هایت را مشخص کن.",
            ],
            [
              "installment",
              "خرید خودرو اقساط بانکی",
              Landmark,
              "شرایط تأمین مالی فقط با شواهد معتبر تأمین‌کننده قابل بررسی است.",
            ],
          ] as const
        ).map(([id, title, Icon, description]) => (
          <article key={id} className={`vehicle-path vehicle-path--${id}`}>
            <Icon aria-hidden="true" />
            <h2>{title}</h2>
            <p>{description}</p>
            <a href="#vehicle-start" onClick={() => setPath(id)}>
              {id === "cash" ? "بررسی مسیر خرید" : "مشاهده شرایط و شروع"}
              <ArrowLeft aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>

      <section className="vehicle-section" aria-labelledby="vehicle-type-title">
        <h2 id="vehicle-type-title">
          <Car aria-hidden="true" />
          انتخاب نوع خودرو
        </h2>
        <div className="vehicle-options vehicle-options--types">
          {TYPES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={vehicleType === item}
              onClick={() => setVehicleType(item)}
            >
              <Car aria-hidden="true" />
              {item}
            </button>
          ))}
        </div>
      </section>

      <section
        className="vehicle-section vehicle-availability"
        aria-labelledby="vehicle-offers-title"
      >
        <h2 id="vehicle-offers-title">فرصت‌های ویژه</h2>
        <ShieldCheck aria-hidden="true" className="vehicle-availability__icon" />
        <h3>هنوز آگهی تأییدشده‌ای متصل نیست</h3>
        <p>
          قیمت، موجودی و شرایط اقساط تا اتصال تأمین‌کنندهٔ معتبر نمایش داده نمی‌شوند. می‌توانی نیازت
          را برای بررسی مسیر شرح بدهی.
        </p>
      </section>

      <section className="vehicle-section" aria-labelledby="vehicle-documents-title">
        <h2 id="vehicle-documents-title">
          <ClipboardList aria-hidden="true" />
          شرایط و مدارک کلیدی
        </h2>
        <p>
          مدارک و شرایط به مسیر و تأمین‌کننده بستگی دارد. بدون پاسخ معتبر، سن مجاز، ضامن، پیش‌پرداخت
          یا زمان تأیید اعلام نمی‌کنیم.
        </p>
      </section>

      <section id="vehicle-start" className="vehicle-start" aria-labelledby="vehicle-start-title">
        <div>
          <h2 id="vehicle-start-title">می‌خواهید بهترین پیشنهاد را دریافت کنید؟</h2>
          <p>
            مشخصات و محدودیت‌های خریدت را با زبان خودت بگو؛ شروع بررسی به معنی تأیید تأمین مالی
            نیست.
          </p>
          <p className="vehicle-selection" role="status">
            انتخاب فعلی: {vehicleType}
            {origin ? ` / ${origin}` : ""}
            {path ? ` / ${path === "cash" ? "خرید نقدی" : "خرید اقساطی"}` : ""}
          </p>
        </div>
        <ConciergeExperience
          suggestedNeed={`می‌خواهم خودرو ${vehicleType === "همه سواری‌ها" ? "سواری" : vehicleType}${origin ? ` ${origin}` : ""}${path === "installment" ? " اقساطی" : path === "cash" ? " نقدی" : ""} بخرم.`}
        />
      </section>
    </AppShell>
  );
}
