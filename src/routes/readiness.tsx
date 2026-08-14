import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { LiquidityJourney } from "@/features/readiness/liquidity-journey";

export const Route = createFileRoute("/readiness")({
  head: () => ({
    meta: [
      { title: "آمادگی اجرا — تسهیل‌رادار" },
      {
        name: "description",
        content: "شفافیت و آمادگی اجرای پرونده را بدون ثبت‌نام و جدا از اعتبار و تطبیق بررسی کن.",
      },
    ],
  }),
  component: ReadinessRoute,
});

function ReadinessRoute() {
  return (
    <AppShell>
      <LiquidityJourney />
    </AppShell>
  );
}
