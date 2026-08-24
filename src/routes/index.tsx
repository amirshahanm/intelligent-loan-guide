import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ConciergeExperience } from "@/features/concierge/concierge-experience";
import { RouteReveal } from "@/features/concierge/route-reveal";
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

  return (
    <AppShell>
      <div className="space-y-5">
        <ConciergeExperience />
        {latestIntentText ? <RouteReveal slots={state.slots} needText={latestIntentText} /> : null}
      </div>
    </AppShell>
  );
}
