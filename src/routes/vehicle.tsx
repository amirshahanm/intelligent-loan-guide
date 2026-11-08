import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Car,
  Landmark,
  ClipboardList,
  ExternalLink,
  HandCoins,
  BadgeCheck,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConciergeExperience } from "@/features/concierge/concierge-experience";
import {
  DealerInstallmentCalculator,
  parsePriceInput,
} from "@/features/vehicle/dealer-installment-calculator";
import {
  SHAHAN_AUTO_INSTALLMENT_TERMS as TERMS,
  SHAHAN_AUTO_PARTNER,
  SHAHAN_AUTO_PUBLIC_URL,
} from "@/lib/partners/shahan-auto";
import { toDisplayDigits } from "@/lib/money";

type VehicleSearch = { price?: string; car?: string; from?: string };

export const Route = createFileRoute("/vehicle")({
  head: () => ({ meta: [{ title: "خدمات خودرو — تسهیل‌رادار" }] }),
  // A partner listing may prefill the calculator. These values are a visible,
  // editable starting point only; they are never an order or a verified price.
  validateSearch: (search: Record<string, unknown>): VehicleSearch => ({
    price:
      typeof search.price === "string"
        ? search.price.slice(0, 40)
        : typeof search.price === "number" && Number.isFinite(search.price)
          ? String(search.price)
          : undefined,
    car: typeof search.car === "string" ? search.car.slice(0, 80) : undefined,
    from: typeof search.from === "string" ? search.from.slice(0, 30) : undefined,
  }),
  component: VehiclePage,
});

const TYPES = ["همه سواری‌ها", "هاچ‌بک", "سدان", "شاسی‌بلند", "کراس‌اوور"];
const ORIGINS = ["ایرانی", "خارجی", "وارداتی"];

function VehiclePage() {
  const [vehicleType, setVehicleType] = React.useState(TYPES[0]);
  const [origin, setOrigin] = React.useState<string | null>(null);
  const [path, setPath] = React.useState<"cash" | "dealer" | "installment" | null>(null);
  const [preset, setPreset] = React.useState<{ text: string; nonce: number } | undefined>();
  const search = Route.useSearch();
  const listingPrice = search.price ? parsePriceInput(search.price) : null;
  const listingLabel =
    search.car && search.from === "shahan-auto"
      ? `از آگهی ${SHAHAN_AUTO_PARTNER.name}: ${search.car}`
      : (search.car ?? null);

  return (
    <AppShell className="vehicle-page">
      <h1 className="vehicle-page__title">خدمات خودرو</h1>
      <section className="vehicle-hero" aria-labelledby="vehicle-heading">
        <div className="vehicle-hero__copy">
          <p>همه مسیرها برای خرید خودروی دلخواه</p>
          <h2 id="vehicle-heading">
            از <span className="vehicle-gold">نقدی</span> تا <span>قسط مستقیم</span>
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

      <DealerInstallmentCalculator
        initialPriceIrr={listingPrice}
        initialLabel={listingLabel}
        onContinue={(text) => {
          setPath("dealer");
          setPreset({ text, nonce: Date.now() });
          document.getElementById("vehicle-start")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

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
              "dealer",
              "قسط مستقیم نمایشگاه",
              HandCoins,
              `حداقل ${toDisplayDigits(TERMS.minDownPaymentPercent)}٪ نقد، باقی تا ${toDisplayDigits(TERMS.maxMonths)} ماه با چک صیادی یا سفته؛ بدون ضامن.`,
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
            <a
              href={id === "dealer" ? "#vehicle-calculator" : "#vehicle-start"}
              onClick={() => setPath(id)}
            >
              {id === "cash"
                ? "بررسی مسیر خرید"
                : id === "dealer"
                  ? "محاسبهٔ قسط"
                  : "مشاهده شرایط و شروع"}
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
        className="vehicle-section vehicle-availability vehicle-partner"
        aria-labelledby="vehicle-offers-title"
      >
        <h2 id="vehicle-offers-title">
          <BadgeCheck aria-hidden="true" />
          خودروهای {SHAHAN_AUTO_PARTNER.name}
        </h2>
        <p>
          {SHAHAN_AUTO_PARTNER.name} همکار تسهیل‌رادار در قسط مستقیم خودرو است. خودروی دلخواهت را
          آنجا ببین، قیمتش را در ماشین‌حساب بالا بنویس و با همین شرایط ادامه بده.
        </p>
        <a
          className="vehicle-partner__link"
          href={SHAHAN_AUTO_PUBLIC_URL}
          target="_blank"
          rel="noopener"
        >
          دیدن خودروها در {SHAHAN_AUTO_PARTNER.name}
          <ExternalLink aria-hidden="true" />
        </a>
        <small>
          نمایش آگهی‌ها مستقیم در همین صفحه پس از اتصال فهرست خودروها فعال می‌شود. این همکاری در
          رتبه‌بندی مسیرهای تو اثری ندارد.
        </small>
      </section>

      <section className="vehicle-section" aria-labelledby="vehicle-documents-title">
        <h2 id="vehicle-documents-title">
          <ClipboardList aria-hidden="true" />
          شرایط و مدارک کلیدی
        </h2>
        <ul className="vehicle-docs">
          <li>
            <strong>قسط مستقیم {SHAHAN_AUTO_PARTNER.name}</strong>
            <span>
              پیش‌پرداخت حداقل {toDisplayDigits(TERMS.minDownPaymentPercent)}٪، چک صیادی یا سفته با
              مبلغ توافقی، بدون ضامن.
            </span>
          </li>
          <li>
            <strong>اقساط بانکی و لیزینگ</strong>
            <span>
              مدارک و شرایط به تأمین‌کننده بستگی دارد. بدون پاسخ معتبر، سن مجاز، ضامن، پیش‌پرداخت یا
              زمان تأیید اعلام نمی‌کنیم.
            </span>
          </li>
        </ul>
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
            {path
              ? ` / ${path === "cash" ? "خرید نقدی" : path === "dealer" ? "قسط مستقیم نمایشگاه" : "اقساط بانکی"}`
              : ""}
          </p>
        </div>
        <ConciergeExperience
          suggestedNeed={`می‌خواهم خودرو ${vehicleType === "همه سواری‌ها" ? "سواری" : vehicleType}${origin ? ` ${origin}` : ""}${path === "installment" || path === "dealer" ? " اقساطی" : path === "cash" ? " نقدی" : ""} بخرم.`}
          presetNeed={preset}
        />
      </section>
    </AppShell>
  );
}
