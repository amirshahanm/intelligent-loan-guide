import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { OpportunityCard } from "@/features/opportunity/opportunity-card";
import { AuthorityBadge, SectionTitle } from "@/components/provenance";
import { useAuthoritativeTrace } from "@/hooks/use-authoritative-trace";
import { useSession } from "@/lib/session";
import { fitBand, track } from "@/lib/analytics";
import { toPersianDigits } from "@/lib/money";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "فرصت‌های تو — تسهیل‌رادار" },
      {
        name: "description",
        content:
          "فرصت‌های وام و اعتبار متناسب با وضعیت تو، همراه با سقف قابل دسترس، دلیل تطابق و شکاف‌هایی که باید پر شود.",
      },
      { property: "og:title", content: "فرصت‌های وام متناسب با وضعیت تو" },
      {
        property: "og:description",
        content: "هر فرصت با سقف قابل دسترس، دلیل انتخاب و قدم بعدی مشخص.",
      },
    ],
  }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  const { state, hydrated } = useSession();
  const { trace, confirmed, confirming } = useAuthoritativeTrace();

  React.useEffect(() => {
    for (const match of trace.matches) {
      track({
        name: "match_generated",
        productId: match.productId,
        tier: match.tier,
        fitBand: fitBand(match.fitScore),
      });
    }
  }, [trace.runId, trace.matches]);

  if (!hydrated) return <AppShell>{null}</AppShell>;

  if (state.messages.length === 0) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <h1 className="text-base font-bold">هنوز فرصتی محاسبه نشده</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            برای دیدن فرصت‌ها اول باید بدانم چه می‌خواهی.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
          >
            شروع گفت‌وگو
          </Link>
        </div>
      </AppShell>
    );
  }

  const primary = trace.matches.filter((m) => m.tier === "primary");
  const near = trace.matches.filter((m) => m.tier === "near");

  return (
    <AppShell className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">فرصت‌های تو</h1>
        <AuthorityBadge computedBy={confirmed ? "server-authoritative" : trace.computedBy} />
      </div>

      {confirming ? (
        <p className="text-[11px] text-muted-foreground">در حال تأیید نتیجه با موتور سرور…</p>
      ) : null}

      {trace.matches.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-sm font-bold text-warn">فعلاً مسیر بازی پیدا نشد</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            با وضعیت فعلی، همهٔ مسیرهای موجود حذف شدند. این پایان راه نیست — رادار نشان می‌دهد کدام
            شرط باعث حذف شده و با تغییر کدام مورد دوباره باز می‌شود.
          </p>
          <Link
            to="/radar"
            className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
          >
            دیدن دلیل حذف‌ها
          </Link>
        </div>
      ) : null}

      {primary.length > 0 ? (
        <section className="space-y-3">
          <SectionTitle hint={`${toPersianDigits(primary.length)} مورد`}>
            بهترین تطابق‌ها
          </SectionTitle>
          {primary.map((match, i) => (
            <OpportunityCard key={match.productId} match={match} rank={i} />
          ))}
        </section>
      ) : null}

      {near.length > 0 ? (
        <section className="space-y-3">
          <SectionTitle hint="با یک تغییر کوچک قابل دسترس">مسیرهای نزدیک</SectionTitle>
          {near.map((match, i) => (
            <OpportunityCard key={match.productId} match={match} rank={i} />
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
