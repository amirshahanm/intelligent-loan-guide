import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ConciergeExperience } from "@/features/concierge/concierge-experience";
import { RouteReveal } from "@/features/concierge/route-reveal";
import { HomeRadar, type HomeRadarServiceId } from "@/features/home/home-radar";
import { PopularServicesCarousel } from "@/features/home/popular-services-carousel";
import { isAssessmentComplete } from "@/core/questions";
import { useSession } from "@/lib/session";

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
      </div>
    </AppShell>
  );
}
