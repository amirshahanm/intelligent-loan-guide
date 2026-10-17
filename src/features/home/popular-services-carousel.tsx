import * as React from "react";
import { Link } from "@tanstack/react-router";
import type { HomeRadarServiceId } from "./home-radar";
import { cn } from "@/lib/utils";
import { PopularServiceArt, type PopularServiceArtId } from "./popular-service-art";
import { isFinanceServiceId } from "./finance-services";

const SERVICES = [
  {
    id: "vehicle-installment",
    label: "خودرو اقساط",
    radarService: "bank",
  },
  { id: "cash-loan", label: "وام نقدی", radarService: "bank" },
  { id: "goods-loan", label: "وام کالا", radarService: "mobile" },
  { id: "credit-check", label: "اعتبارسنجی", radarService: "credit" },
  { id: "sakha-code", label: "کد سخا", radarService: "credit" },
  { id: "import-export", label: "واردات و صادرات", radarService: "trade" },
  {
    id: "bank-credit-trade",
    label: "خرید و فروش اعتبار بانک‌ها",
    radarService: "bank",
  },
  { id: "vehicle-services", label: "خدمات خودرو", radarService: "bank" },
  {
    id: "working-capital",
    label: "سرمایه در گردش کسب‌وکار",
    radarService: "bank",
  },
  {
    id: "business-equipment",
    label: "تأمین مالی تجهیزات کسب‌وکار",
    radarService: "bank",
  },
  {
    id: "property-finance",
    label: "تأمین مالی خرید ملک",
    radarService: "bank",
  },
  {
    id: "trade-finance-routes",
    label: "مسیرهای تجاری و تأمین مالی بازرگانی",
    radarService: "trade",
  },
] as const satisfies ReadonlyArray<{
  id: PopularServiceArtId;
  label: string;
  radarService: HomeRadarServiceId;
}>;

export function PopularServicesCarousel({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (service: { id: string; label: string; radarService: HomeRadarServiceId }) => void;
}) {
  const [activePage, setActivePage] = React.useState(0);

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const maxScroll = element.scrollWidth - element.clientWidth;
    if (maxScroll <= 0) {
      setActivePage(0);
      return;
    }
    setActivePage(Math.min(3, Math.round((element.scrollLeft / maxScroll) * 3)));
  }, []);

  return (
    <section className="popular-services" aria-labelledby="popular-services-title">
      <div className="popular-services__heading">
        <span aria-hidden="true">✦</span>
        <h2 id="popular-services-title">پرکاربرد</h2>
      </div>

      <div
        className="popular-services__viewport no-scrollbar"
        dir="ltr"
        onScroll={handleScroll}
        aria-label="سرویس‌های پرکاربرد؛ برای دیدن ادامه به‌صورت افقی حرکت کنید"
      >
        {SERVICES.map((service) => {
          const selected = service.id === selectedId;
          return (
            <button
              key={service.id}
              type="button"
              dir="rtl"
              aria-pressed={selected}
              className={cn("popular-service-card", selected && "is-selected")}
              onClick={() => onSelect(service)}
              data-service-id={service.id}
            >
              <PopularServiceArt id={service.id} />
              <span>{service.label}</span>
            </button>
          );
        })}
      </div>

      <div className="popular-services__pages" aria-hidden="true">
        {[0, 1, 2, 3].map((page) => (
          <span key={page} className={cn(page === activePage && "is-active")} />
        ))}
      </div>
      {selectedId === "vehicle-installment" || selectedId === "vehicle-services" ? (
        <Link to="/vehicle" className="vehicle-discovery-link">
          مشاهده خدمات خودرو ←
        </Link>
      ) : null}
      {selectedId === "goods-loan" ? (
        <Link to="/goods" className="vehicle-discovery-link">
          مشاهده وام کالا ←
        </Link>
      ) : null}
      {selectedId === "credit-check" || selectedId === "sakha-code" ? (
        <Link to="/credit" className="vehicle-discovery-link">
          مشاهده اعتبارسنجی و کد سخا ←
        </Link>
      ) : null}
      {selectedId === "import-export" || selectedId === "trade-finance-routes" ? (
        <Link to="/trade" className="vehicle-discovery-link">
          مشاهده واردات و صادرات ←
        </Link>
      ) : null}
      {selectedId === "bank-credit-trade" ? (
        <Link to="/bank-credit" className="vehicle-discovery-link">
          مشاهده خرید و فروش اعتبار بانک‌ها ←
        </Link>
      ) : null}
      {isFinanceServiceId(selectedId) ? (
        <Link
          to="/finance/$service"
          params={{ service: selectedId }}
          className="vehicle-discovery-link"
        >
          مشاهده {SERVICES.find((service) => service.id === selectedId)?.label} ←
        </Link>
      ) : null}
    </section>
  );
}
