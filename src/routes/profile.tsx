import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { AuthorityBadge, ProvenanceChip, SectionTitle } from "@/components/provenance";
import { ReasoningNotice } from "@/components/reasoning-notice";
import { ReadinessPanel } from "@/features/readiness/readiness-panel";
import { SlotChips } from "@/features/concierge/slot-chips";
import { ClaimProfileCard } from "@/features/profile/claim-profile-card";
import { useAuthoritativeTrace } from "@/hooks/use-authoritative-trace";
import { useSession } from "@/lib/session";
import { providerVerified } from "@/core/types";
import { faRelativeTime, formatTomanCompact, toDisplayDigits } from "@/lib/money";
import { cn } from "@/lib/utils";
import { BadgeCheck, CircleUserRound, ClipboardList, CreditCard, ShieldCheck } from "lucide-react";

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
    <AppShell className="profile-page space-y-5">
      <header className="profile-overview">
        <div className="profile-overview__copy">
          <span className="profile-overview__eyebrow">مرکز اطلاعات مالی و هویت تو</span>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">پروندهٔ مالی من</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            اطلاعاتی که با اجازهٔ تو ثبت شده، منبع هر داده و قدم‌هایی که پرونده را کامل‌تر می‌کند.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="profile-status">
              <span className="profile-status__dot" />
              {status.label}
            </span>
            <AuthorityBadge computedBy={confirmed ? "server-authoritative" : trace.computedBy} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{status.hint}</p>
        </div>
        <ProfileIdentityVisual />
      </header>

      {state.messages.length > 0 ? <ReasoningNotice /> : null}
      <section className="profile-snapshot" aria-label="خلاصهٔ پرونده">
        <ProfileMetric
          icon={<CircleUserRound aria-hidden="true" />}
          label="اطلاعات ثبت‌شده"
          value={`${toDisplayDigits(filled)} مورد`}
          note={filled === 0 ? "هنوز داده‌ای ثبت نشده" : "از گفته‌های خودت"}
        />
        <ProfileMetric
          icon={<ShieldCheck aria-hidden="true" />}
          label="وضعیت پرونده"
          value={status.label}
          note="وضعیت فعلی حساب"
        />
        <ProfileMetric
          icon={<CreditCard aria-hidden="true" />}
          label="سیگنال اعتباری"
          value={state.creditResult ? toDisplayDigits(state.creditResult.signal) : "دریافت نشده"}
          note={state.creditResult ? "نتیجهٔ ثبت‌شده" : "بدون نتیجهٔ ساختگی"}
        />
        <ProfileMetric
          icon={<ClipboardList aria-hidden="true" />}
          label="درخواست‌های انسانی"
          value={`${toDisplayDigits(state.handoffs.length)} مورد`}
          note={state.handoffs.length === 0 ? "هنوز درخواستی ثبت نشده" : "ثبت‌شده در پرونده"}
        />
      </section>

      {returning ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-3 text-xs text-accent">
          خوش برگشتی. پرونده‌ات همان‌جایی است که رهایش کردی — آخرین فعالیت{" "}
          <span className="num">{faRelativeTime(state.lastSeenAt)}</span>.
        </div>
      ) : null}

      <section className="profile-session surface-panel rounded-3xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck aria-hidden="true" className="size-4 text-accent" />
              شناسهٔ نشست
            </div>
            <div className="num mt-1 text-xs text-foreground/80">{state.anonSessionId}</div>
          </div>
          <div className="text-end">
            <span className="profile-status profile-status--quiet">{status.label}</span>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          این شناسه فقط برای پیوستگی تجربهٔ توست و مجوز دسترسی نیست. با فعال‌شدن حساب کاربری، مالکیت
          پرونده سمت سرور احراز و منتقل می‌شود.
        </p>
      </section>

      <ClaimProfileCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReadinessPanel readiness={trace.readiness} />

        <section className="rounded-3xl border border-border bg-surface p-4">
          <SectionTitle hint={`${toDisplayDigits(filled)} مورد ثبت‌شده`}>
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
                {toDisplayDigits(state.creditResult.signal)}
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
        <SectionTitle hint={`${toDisplayDigits(state.handoffs.length)} مورد`}>
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
          <li>
            · قبل از اتصال حساب، داده‌های محلی فقط برای ادامهٔ تجربه روی همین مرورگر نگه داشته
            می‌شوند.
          </li>
          <li>
            · تسهیل‌رادار فایل صوتی ذخیره نمی‌کند؛ تشخیص گفتار تابع تنظیمات و سرویس مرورگر است.
          </li>
          <li>· نتایج قطعی همیشه با اجرای دوبارهٔ موتور روی سرور تأیید می‌شود.</li>
          <li>· بعد از Claim، مالکیت پرونده و تصمیم‌ها سمت سرور به حساب احراز‌شده متصل می‌شود.</li>
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

function ProfileMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="profile-metric">
      <span className="profile-metric__icon">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="mt-1 truncate text-sm font-bold text-foreground">{value}</div>
        <div className="mt-1 truncate text-[10px] text-muted-foreground">{note}</div>
      </div>
    </article>
  );
}

function ProfileIdentityVisual() {
  return (
    <div className="profile-orbit" aria-hidden="true">
      <svg viewBox="0 0 220 220" role="presentation">
        <defs>
          <radialGradient id="profile-core" cx="50%" cy="35%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
          </radialGradient>
          <linearGradient id="profile-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--color-signal)" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <circle cx="110" cy="110" r="88" fill="url(#profile-core)" />
        <circle cx="110" cy="110" r="77" fill="none" stroke="var(--color-border)" />
        <circle
          cx="110"
          cy="110"
          r="63"
          fill="none"
          stroke="url(#profile-line)"
          strokeWidth="1.5"
        />
        <circle
          cx="110"
          cy="110"
          r="51"
          fill="none"
          stroke="var(--color-border)"
          strokeDasharray="2 7"
        />
        <circle cx="110" cy="82" r="18" fill="var(--color-accent)" fillOpacity="0.78" />
        <path
          d="M71 151c4-24 19-37 39-37s35 13 39 37c-11 9-24 13-39 13s-28-4-39-13Z"
          fill="var(--color-accent)"
          fillOpacity="0.62"
        />
        <circle cx="43" cy="115" r="4" fill="var(--color-signal)" />
        <circle cx="171" cy="72" r="3.5" fill="var(--color-accent)" />
        <circle cx="158" cy="177" r="3" fill="var(--color-signal)" />
      </svg>
      <span className="profile-orbit__badge">
        <BadgeCheck />
      </span>
    </div>
  );
}
