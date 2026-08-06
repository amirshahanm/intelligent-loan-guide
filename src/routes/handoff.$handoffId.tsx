import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { ProvenanceChip, SectionTitle } from "@/components/provenance";
import { providerVerified } from "@/core/types";
import { faRelativeTime, toPersianDigits } from "@/lib/money";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/handoff/$handoffId")({
  head: () => ({
    meta: [
      { title: "پیگیری بررسی انسانی — تسهیل‌رادار" },
      {
        name: "description",
        content:
          "وضعیت درخواست بررسی کارشناس: جایگاه در صف، خلاصهٔ پرونده‌ای که ارسال شده و قدم‌های بعدی.",
      },
      { property: "og:title", content: "پیگیری بررسی انسانی در تسهیل‌رادار" },
      {
        property: "og:description",
        content: "جایگاه در صف، خلاصهٔ پرونده و قدم بعدی — کاملاً شفاف.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HandoffPage,
});

const STEPS = [
  { key: "queued", label: "ثبت در صف", detail: "درخواست تو ثبت شد و در نوبت بررسی است." },
  { key: "assigned", label: "تخصیص کارشناس", detail: "یک کارشناس پرونده را برمی‌دارد." },
  { key: "in_review", label: "بررسی پرونده", detail: "مدارک و شرایط با تأمین‌کننده تطبیق داده می‌شود." },
  { key: "closed", label: "جمع‌بندی", detail: "نتیجه و مسیر اجرایی به تو اعلام می‌شود." },
] as const;

function HandoffPage() {
  const { handoffId } = useParams({ from: "/handoff/$handoffId" });
  const { state, hydrated } = useSession();

  const handoff = React.useMemo(
    () => state.handoffs.find((h) => h.id === handoffId),
    [state.handoffs, handoffId],
  );

  if (!hydrated) return <AppShell>{null}</AppShell>;

  if (!handoff) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <h1 className="text-base font-bold">این درخواست پیدا نشد</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            درخواست‌های بررسی انسانی روی همین دستگاه نگه‌داری می‌شوند.
          </p>
          <Link
            to="/profile"
            className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
          >
            بازگشت به پرونده
          </Link>
        </div>
      </AppShell>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === handoff.status);

  return (
    <AppShell className="space-y-5">
      <Link to="/profile" className="text-xs text-muted-foreground">
        ← پروندهٔ من
      </Link>

      <header className="surface-panel rounded-3xl p-5">
        <div className="text-[10px] text-muted-foreground">درخواست بررسی انسانی</div>
        <h1 className="mt-1 text-lg font-extrabold">{handoff.productName}</h1>
        <p className="text-xs text-muted-foreground">{handoff.partnerName}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl border border-gold/40 bg-gold/10 p-3">
            <div className="num text-2xl font-extrabold text-gold">
              {toPersianDigits(handoff.queuePosition)}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">جایگاه در صف</div>
          </div>
          <div className="rounded-2xl border border-border bg-elevated/50 p-3">
            <div className="num text-sm font-bold">{faRelativeTime(handoff.createdAt)}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">زمان ثبت</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ProvenanceChip provenance={{ ...providerVerified(1), asOf: handoff.createdAt }} />
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <SectionTitle hint="کانال: صف درون‌برنامه‌ای">مسیر بررسی</SectionTitle>
        <ol className="relative space-y-4 ps-5">
          <span className="absolute inset-y-1 start-[5px] w-px bg-border" aria-hidden />
          {STEPS.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={step.key} className="relative">
                <span
                  className={cn(
                    "absolute -start-5 top-1 size-2.5 rounded-full",
                    done ? "bg-accent" : active ? "bg-accent anim-pulse-node" : "bg-border",
                  )}
                />
                <div
                  className={cn(
                    "text-sm font-semibold",
                    done || active ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {step.label}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{step.detail}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <SectionTitle>خلاصه‌ای که ارسال شد</SectionTitle>
        <p className="text-xs leading-6 text-foreground/85">{handoff.summary}</p>
        <p className="num mt-3 text-[10px] text-muted-foreground">شمارهٔ پیگیری: {handoff.id}</p>
      </section>

      <Link
        to="/opportunity/$productId"
        params={{ productId: handoff.productId }}
        className="block rounded-2xl border border-border px-4 py-3 text-center text-sm"
      >
        بازگشت به جزئیات این فرصت
      </Link>
    </AppShell>
  );
}
