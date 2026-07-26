import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ConciergeExperience } from "@/features/concierge/concierge-experience";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "تسهیل‌رادار — یک جمله بگو، مسیر وامت را ببین" },
      {
        name: "description",
        content:
          "بدون ثبت‌نام بگو چه مبلغی و برای چه می‌خواهی؛ تسهیل‌رادار مسیرهای وام و اعتبار را می‌سنجد، بن‌بست‌ها را حذف می‌کند و دلیل هر تصمیم را نشان می‌دهد.",
      },
      { property: "og:title", content: "تسهیل‌رادار — ناوبر هوشمند وام و اعتبار" },
      {
        property: "og:description",
        content: "یک جمله بنویس یا بگو تا مسیرهای واقعی وام و اعتبارت را با دلیل ببینی.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <AppShell>
      <ConciergeExperience />
    </AppShell>
  );
}
