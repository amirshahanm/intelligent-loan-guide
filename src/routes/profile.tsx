import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { AuthorityBadge, ProvenanceChip, SectionTitle } from "@/components/provenance";
import { ReadinessPanel } from "@/features/readiness/readiness-panel";
import { SlotChips } from "@/features/concierge/slot-chips";
import { useAuthoritativeTrace } from "@/hooks/use-authoritative-trace";
import { useSession } from "@/lib/session";
import { providerVerified } from "@/core/types";
import { faRelativeTime, formatTomanCompact, toPersianDigits } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "پروندهٔ مالی من — تسهیل‌رادار" },
      {
        name: "description",
        content:
          "پروندهٔ مالی تو بدون ثبت‌نام: آنچه سیستم دربارهٔ تو فهمیده، منبع هر داده، میزان آمادگی و قدم‌هایی که بیشترین اثر را دارند.",
      },
      { property: "og:title", content: "پروندهٔ مالی من در تسهیل‌رادار" },
      {
        property: "og:description",
        content: "آمادگی پرونده، منبع هر داده و قدم‌های اثرگذار — بدون ثبت‌نام.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const STATUS_FA: Record<string, { label: string; hint: string }> = {
  ANONYMOUS: { label: "مهمان", hint: "بدون ثبت‌نام؛ پرونده فقط روی همین دستگاه است." },
  ENGAGED: { label: "در حال شکل‌گیری", hint: "خواسته‌ات ثبت شده و پرونده در حال کامل شدن است." },
  IDENTIFIED: { label: "احراز شده", hint: "شمارهٔ موبایل تأیید شده است." },
  CLAIMED: { label: "متصل به حساب", hint: "پروندهٔ مهمان به حساب تو منتقل شده است." },
};

function ProfilePage() {
  const { state, update, reset, hydrated } = useSession();
  const { trace, confirmed, confirming } = useAuthoritativeTrace();
  const [confirmReset, setConfirmReset] = React.useState(false);

  if (!hydrated) return <AppShell>{null}</AppShell>;

  const filled = Object.keys(state.slots).length;
  const status = STATUS_FA[state.status] ?? STATUS_FA.ANONYMOUS;
  const returning =
    new Date(state.lastSeenAt).getTime() - new Date(state.createdAt).getTime() > 5 * 60_000;

  return (
    <AppShell className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">پروندهٔ مالی من</h1>
        <AuthorityBadge computedBy={confirmed ? "server-authoritative" : trace.computedBy} />
      </div>

      {returning ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-3 text-xs text-accent">
          خوش برگشتی. پرونده‌ات همان‌جایی است که رهایش کردی — آخرین فعالیت{" "}
          <span className="num">{faRelativeTime(state.lastSeenAt)}</span>.
        </div>
      ) : null}

      <section className="surface-panel rounded-3xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground">وضعیت پرونده</div>
            <div className="text-base font-bold">{status.label}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">{status.hint}</p>
          </div>
          <div className="text-end">
            <div className="text-[10px] text-muted-foreground">شناسهٔ نشست</div>
            <div className="num text-[11px] text-foreground/80">{state.anonSessionId}</div>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          این شناسه فقط برای پیوستگی تجربهٔ توست و مجوز دسترسی نیست. با فعال‌شدن حساب کاربری، مالکیت
          پرونده سمت سرور احراز و منتقل می‌شود.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReadinessPanel readiness={trace.readiness} />

        <section className="rounded-3xl border border-border bg-surface p-4">
          <SectionTitle hint={`${toPersianDigits(filled)} مورد ثبت‌شده`}>
            آنچه دربارهٔ تو می‌دانم
          </SectionTitle>
          {filled === 0 ? (
            <p className="text-xs text-muted-foreground">
              هنوز چیزی ثبت نشده. یک جمله بگو تا پرونده شکل بگیرد.
            </p>
          ) : (
            <SlotChips slots={state.slots} />
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/"
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
            >
              کامل کردن پرونده
            </Link>
            {filled > 0 ? (
              <button
                type="button"
                onClick={() => update((s) => ({ ...s, slots: {}, askedQuestionIds: [] }))}
                className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
              >
                پاک کردن اطلاعات فهمیده‌شده
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <Link
        to="/readiness"
        className="block rounded-3xl border border-accent/35 bg-accent/10 p-4 transition-colors hover:bg-accent/15"
      >
        <div className="text-sm font-bold text-accent">سنجش آمادگی اجرا</div>
        <p className="mt-1 text-xs text-muted-foreground">
          چند واقعیتِ هنوز نامشخص را روشن کن و امتیاز، عوامل و بهترین اقدام بعدی را ببین.
        </p>
      </Link>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <SectionTitle>سیگنال اعتباری</SectionTitle>
        {state.creditResult ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="num text-2xl font-extrabold text-signal">
                {toPersianDigits(state.creditResult.signal)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                ظرفیت تخمینی {formatTomanCompact(state.creditResult.estimatedCapacity)}
              </div>
              <div className="mt-2">
                <ProvenanceChip
                  provenance={{ ...providerVerified(0.9), asOf: state.creditResult.asOf }}
                />
              </div>
            </div>
            <Link to="/credit" className="rounded-full border border-border px-4 py-2 text-xs">
              دیدن جزئیات
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              هنوز اعتبارسنجی نشده‌ای. با آن، سقف‌ها و مسیرها دقیق‌تر می‌شود.
            </p>
            <Link
              to="/credit"
              className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-gold-foreground"
            >
              اعتبارسنجی
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <SectionTitle hint={`${toPersianDigits(state.handoffs.length)} مورد`}>
          درخواست‌های بررسی انسانی
        </SectionTitle>
        {state.handoffs.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            هنوز هیچ پرونده‌ای برای بررسی کارشناس ثبت نکرده‌ای.
          </p>
        ) : (
          <ul className="space-y-2">
            {state.handoffs.map((h) => (
              <li key={h.id}>
                <Link
                  to="/handoff/$handoffId"
                  params={{ handoffId: h.id }}
                  className="block rounded-2xl border border-border bg-elevated/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{h.productName}</span>
                    <span className="num text-[10px] text-muted-foreground">
                      {faRelativeTime(h.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{h.partnerName}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <SectionTitle>شخصی‌سازی و داده</SectionTitle>
        <ul className="space-y-1.5 text-[11px] leading-5 text-muted-foreground">
          <li>· همهٔ داده‌های تو روی همین مرورگر می‌ماند و به‌صورت خودکار جایی ارسال نمی‌شود.</li>
          <li>· صدا هرگز ذخیره نمی‌شود؛ فقط متن حاصل از تشخیص گفتار استفاده می‌شود.</li>
          <li>· نتایج قطعی همیشه با اجرای دوبارهٔ موتور روی سرور تأیید می‌شود.</li>
        </ul>
        <button
          type="button"
          onClick={() => (confirmReset ? reset() : setConfirmReset(true))}
          className={cn(
            "mt-4 w-full rounded-2xl px-4 py-2.5 text-xs font-semibold",
            confirmReset
              ? "bg-danger text-danger-foreground"
              : "border border-border text-muted-foreground",
          )}
        >
          {confirmReset ? "مطمئنی؟ همه‌چیز پاک شود" : "پاک کردن کامل پرونده"}
        </button>
        {confirming ? (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            در حال تأیید نتیجه با موتور سرور…
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
