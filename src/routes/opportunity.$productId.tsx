import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { AuthorityBadge, ProvenanceChip, SectionTitle } from "@/components/provenance";
import { FitRing } from "@/features/opportunity/opportunity-card";
import { useAuthoritativeTrace } from "@/hooks/use-authoritative-trace";
import { useSession } from "@/lib/session";
import { track } from "@/lib/analytics";
import { catalogFact, derived } from "@/core/types";
import { requestHandoff as requestHandoffServer } from "@/lib/handoff.functions";
import {
  faDays,
  faMonths,
  faPercent,
  formatToman,
  formatTomanCompact,
  toPersianDigits,
} from "@/lib/money";

export const Route = createFileRoute("/opportunity/$productId")({
  head: () => ({
    meta: [
      { title: "جزئیات فرصت — تسهیل‌رادار" },
      {
        name: "description",
        content:
          "دلیل انتخاب این مسیر، شکاف‌های باقی‌مانده، بازپرداخت تخمینی و قدم بعدی برای پیش بردن پرونده.",
      },
      { property: "og:title", content: "جزئیات یک فرصت در تسهیل‌رادار" },
      { property: "og:description", content: "دلیل تطابق، شکاف‌ها و قدم بعدی." },
    ],
  }),
  component: OpportunityPage,
});

function monthlyPayment(principalIrr: number, ratePercent: number, months: number) {
  const r = ratePercent / 100 / 12;
  if (r === 0) return Math.round(principalIrr / months);
  const factor = Math.pow(1 + r, months);
  return Math.round((principalIrr * r * factor) / (factor - 1));
}

function OpportunityPage() {
  const { productId } = useParams({ from: "/opportunity/$productId" });
  const { state, update, hydrated } = useSession();
  const { trace, confirmed } = useAuthoritativeTrace();
  const [months, setMonths] = React.useState(24);
  const [requesting, setRequesting] = React.useState(false);
  const [handoffError, setHandoffError] = React.useState<string | null>(null);

  const match = trace.matches.find((m) => m.productId === productId);

  React.useEffect(() => {
    if (match) track({ name: "recommendation_viewed", productId: match.productId });
  }, [match?.productId]);

  React.useEffect(() => {
    if (match) setMonths(Math.min(24, match.maxTermMonths));
  }, [match?.productId, match?.maxTermMonths]);

  if (!hydrated) return <AppShell>{null}</AppShell>;

  if (!match) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <h1 className="text-base font-bold">این فرصت دیگر در نتایج تو نیست</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            با تغییر اطلاعاتت، موتور استدلال دوباره ارزیابی کرده است.
          </p>
          <Link
            to="/opportunities"
            className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
          >
            بازگشت به فرصت‌ها
          </Link>
        </div>
      </AppShell>
    );
  }

  const handoff = state.handoffs.find((h) => h.productId === match.productId);
  const installment = monthlyPayment(match.reachableAmount, match.ratePercent, months);
  const backendReady = Boolean(
    state.backend?.sessionId && state.backend?.sessionCapability && state.backend?.caseId,
  );

  const requestHandoff = async () => {
    if (!state.backend?.sessionId || !state.backend.sessionCapability || !state.backend.caseId) {
      setHandoffError("برای ثبت امن درخواست، ابتدا تحلیل پرونده باید روی سرور نهایی شود.");
      return;
    }

    setRequesting(true);
    setHandoffError(null);
    track({ name: "handoff_requested", productId: match.productId, channel: "in_app" });
    try {
      const result = await requestHandoffServer({
        data: {
          sessionId: state.backend.sessionId,
          sessionCapability: state.backend.sessionCapability,
          caseId: state.backend.caseId,
          productId: match.productId,
          anonSessionId: state.anonSessionId,
        },
      });
      update((s) => ({ ...s, handoffs: [...s.handoffs, result] }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "handoff_failed";
      setHandoffError(
        message.includes("partner_not_configured")
          ? "این مسیر هنوز شریک اجرایی فعال ندارد؛ درخواست جعلی ثبت نمی‌کنیم."
          : "ثبت درخواست کامل نشد. دوباره تلاش کن.",
      );
    } finally {
      setRequesting(false);
    }
  };

  return (
    <AppShell className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/opportunities" className="text-xs text-muted-foreground">
          ← فرصت‌ها
        </Link>
        <AuthorityBadge computedBy={confirmed ? "server-authoritative" : trace.computedBy} />
      </div>

      <header className="surface-panel rounded-3xl p-4">
        <div className="flex items-start gap-3">
          <FitRing score={match.fitScore} size={64} />
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold">{match.productName}</h1>
            <p className="text-xs text-muted-foreground">{match.partnerName}</p>
            <div className="mt-2 text-[10px] text-muted-foreground">سقف قابل دسترس برای تو</div>
            <div className="num text-2xl font-extrabold text-gold">
              {formatToman(match.reachableAmount)}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ProvenanceChip provenance={catalogFact(match.asOf)} />
          <ProvenanceChip provenance={derived(1)} />
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <SectionTitle hint="تخمینی">شبیه‌ساز بازپرداخت</SectionTitle>
        <input
          type="range"
          min={6}
          max={match.maxTermMonths}
          step={6}
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
          aria-label="مدت بازپرداخت"
        />
        <div className="mt-2 flex items-baseline justify-between">
          <span className="num text-xs text-muted-foreground">{faMonths(months)}</span>
          <span className="num text-lg font-bold text-foreground">
            {formatTomanCompact(installment)} / ماه
          </span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          محاسبه بر پایهٔ نرخ {faPercent(match.ratePercent)} و سقف قابل دسترس است و رقم قطعی مؤسسه
          نیست.
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <SectionTitle>چرا این مسیر برای تو انتخاب شد</SectionTitle>
        <ul className="space-y-1.5">
          {match.matchedBecause.map((reason) => (
            <li key={reason} className="flex gap-2 text-xs text-foreground/85">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
              {reason}
            </li>
          ))}
        </ul>
        {match.gaps.length > 0 ? (
          <>
            <div className="mt-4 text-[10px] text-warn">آنچه هنوز کامل نیست</div>
            <ul className="mt-1 space-y-1.5">
              {match.gaps.map((gap) => (
                <li key={gap.ruleId} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warn" />
                  {gap.message}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="نرخ سالانه" value={faPercent(match.ratePercent)} />
          <Stat label="حداکثر مدت" value={faMonths(match.maxTermMonths)} />
          <Stat label="زمان تا دریافت" value={faDays(match.typicalDays)} />
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <SectionTitle>قدم بعدی</SectionTitle>
        <ul className="space-y-2">
          {match.nextActions.map((action) => (
            <li key={action.id} className="rounded-2xl border border-border bg-elevated/50 p-3">
              <div className="text-sm font-semibold">{action.label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>
            </li>
          ))}
        </ul>

        {handoff ? (
          <Link
            to="/handoff/$handoffId"
            params={{ handoffId: handoff.id }}
            className="mt-4 block rounded-2xl border border-accent/40 bg-accent/10 p-3"
          >
            <div className="text-sm font-semibold text-accent">در صف بررسی انسانی</div>
            <p className="num mt-1 text-xs text-muted-foreground">
              شمارهٔ پیگیری {handoff.id} — جایگاه {toPersianDigits(handoff.queuePosition)} در صف.
            </p>
            <span className="mt-2 block text-[11px] text-accent">پیگیری وضعیت ←</span>
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={requestHandoff}
              disabled={requesting || !backendReady}
              className="mt-4 w-full rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-gold-foreground disabled:opacity-50"
            >
              {requesting ? "در حال ثبت درخواست…" : "می‌خواهم یک کارشناس بررسی کند"}
            </button>
            {!backendReady ? (
              <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                این اقدام بعد از تأیید سروری پرونده فعال می‌شود.
              </p>
            ) : null}
            {handoffError ? <p className="mt-2 text-[11px] text-warn">{handoffError}</p> : null}
          </>
        )}
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated/50 p-2">
      <div className="num text-sm font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
