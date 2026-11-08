import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ConciergeExperience } from "@/features/concierge/concierge-experience";
import { RouteReveal } from "@/features/concierge/route-reveal";
import { HomeRadar, type HomeRadarServiceId } from "@/features/home/home-radar";
import { PopularServicesCarousel } from "@/features/home/popular-services-carousel";
import { HomeJourney } from "@/features/home/home-journey";
import { isAssessmentComplete } from "@/core/questions";
import { useSession } from "@/lib/session";
import { universalNeedFromText } from "@/core/universal-need-extract";
import type { NeedKind } from "@/core/opportunity-routes";

const RADAR_FOR_NEED: Partial<Record<NeedKind, [HomeRadarServiceId, string]>> = {
  purchase_vehicle: ["vehicle", "خرید خودرو"],
  purchase_goods: ["mobile", "خرید موبایل"],
  trade_import: ["trade", "تجارت بین‌الملل"],
  trade_export: ["trade", "تجارت بین‌الملل"],
  cash: ["bank", "وام‌های بانکی"],
  working_capital: ["bank", "وام‌های بانکی"],
  equipment: ["bank", "وام‌های بانکی"],
  purchase_property: ["bank", "وام‌های بانکی"],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "تسهیل‌رادار — مسیر واقعی نیاز مالی و خریدت را پیدا کن" },
      {
        name: "description",
        content:
          "بدون ثبت‌نام نیازت را با زبان خودت بگو؛ تسهیل‌رادار مسیرهای نقدینگی، خرید اقساطی، کسب‌وکار و تجارت را با دلیل بررسی می‌کند و قدم بعدی واقعی را نشان می‌دهد.",
      },
      { property: "og:title", content: "تسهیل‌رادار — ناوبر هوشمند دسترسی مالی و خرید" },
      {
        property: "og:description",
        content:
          "یک جمله بگو تا مسیرهای واقعی تأمین مالی، خرید اعتباری و اجرای نیازت را با دلیل ببینی.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { state } = useSession();
  const latestIntentText = state.intents[state.intents.length - 1]?.text ?? null;
  const [selectedService, setSelectedService] = React.useState<HomeRadarServiceId>("bank");
  const [selectedLabel, setSelectedLabel] = React.useState("وام‌های بانکی");
  const [selectedPopularId, setSelectedPopularId] = React.useState("");
  const [selectionRevision, setSelectionRevision] = React.useState(0);

  const selectRadarService = React.useCallback(
    (service: HomeRadarServiceId, label: string, popularId = "") => {
      setSelectedService(service);
      setSelectedLabel(label);
      setSelectedPopularId(popularId);
      setSelectionRevision((current) => current + 1);
    },
    [],
  );

  // Point the radar at the world the user's own sentence belongs to.
  React.useEffect(() => {
    if (!latestIntentText) return;
    const target = RADAR_FOR_NEED[universalNeedFromText(latestIntentText, state.slots).kind];
    if (target) {
      setSelectedService(target[0]);
      setSelectedLabel(target[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestIntentText]);

  const hasRadarActivity = selectionRevision > 0 || state.intents.length > 0;
  const radarActivityKey = `${selectionRevision}:${state.intents.length}:${state.askedQuestionIds.length}`;
  const canRevealRoute = latestIntentText && isAssessmentComplete(state.slots);

  return (
    <AppShell className="home-page">
      <div className="home-page__content">
        <section className="home-hero" aria-labelledby="home-title">
          <h1 id="home-title">
            راه درست را <span>سریع‌تر</span> پیدا کن
          </h1>
          <p>تسهیل‌رادار، مسیرهای مالی مناسب شما را هوشمندانه پیدا می‌کند.</p>
        </section>

        <HomeRadar
          selectedService={selectedService}
          selectedLabel={selectedLabel}
          activityKey={radarActivityKey}
          active={hasRadarActivity}
          onSelectService={(service, label) => selectRadarService(service, label)}
        />

        <div className="home-entry">
          <ConciergeExperience />
        </div>

        <PopularServicesCarousel
          selectedId={selectedPopularId}
          onSelect={(service) =>
            selectRadarService(service.radarService, service.label, service.id)
          }
        />

        {canRevealRoute ? <RouteReveal slots={state.slots} needText={latestIntentText} /> : null}

        {state.intents.length === 0 ? <HomeJourney /> : null}
      </div>
    </AppShell>
  );
}
