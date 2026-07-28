import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CreditJourney } from "@/features/credit/credit-journey";

export const Route = createFileRoute("/credit")({
  head: () => ({
    meta: [
      { title: "اعتبارسنجی نمایشی — تسهیل‌رادار" },
      {
        name: "description",
        content:
          "پرونده‌ات را از نگاه یک وام‌دهنده ببین: سیگنال اعتباری، ظرفیت تخمینی و توضیح ساده از آنچه مسیرها را باز یا بسته نگه داشته. کاملاً شبیه‌سازی‌شده.",
      },
      { property: "og:title", content: "اعتبارسنجی نمایشی تسهیل‌رادار" },
      {
        property: "og:description",
        content: "سیگنال اعتباری، ظرفیت تخمینی و توضیح شفاف — بدون هیچ استعلام واقعی.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreditPage,
});

function CreditPage() {
  return (
    <AppShell>
      <CreditJourney />
    </AppShell>
  );
}
