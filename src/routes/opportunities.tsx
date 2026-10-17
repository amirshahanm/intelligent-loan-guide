import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { OpportunityCard } from "@/features/opportunity/opportunity-card";
import { AuthorityBadge, SectionTitle } from "@/components/provenance";
import { useAuthoritativeTrace } from "@/hooks/use-authoritative-trace";
import { useSession } from "@/lib/session";
import { fitBand, track } from "@/lib/analytics";
import { toDisplayDigits } from "@/lib/money";
import { Search } from "lucide-react";
import { ReasoningNotice } from "@/components/reasoning-notice";

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
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "primary" | "near">("all");

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
  const normalizedQuery = query.trim().toLocaleLowerCase("fa-IR");
  const visibleMatches = trace.matches.filter((match) => {
    const matchesTier = filter === "all" || match.tier === filter;
    const searchableText = [
      match.productName,
      match.partnerName,
      ...match.matchedBecause,
      ...match.gaps.map((gap) => gap.message),
    ]
      .join(" ")
      .toLocaleLowerCase("fa-IR");
    return matchesTier && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
  const visiblePrimary = visibleMatches.filter((m) => m.tier === "primary");
  const visibleNear = visibleMatches.filter((m) => m.tier === "near");

  return (
    <AppShell className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">فرصت‌های تو</h1>
        <AuthorityBadge computedBy={confirmed ? "server-authoritative" : trace.computedBy} />
      </div>

      {confirming ? (
        <p className="text-[11px] text-muted-foreground">در حال تأیید نتیجه با موتور سرور…</p>
      ) : null}
      <ReasoningNotice />

      {trace.matches.length > 0 ? (
        <section className="space-y-3" aria-label="جست‌وجو و فیلتر فرصت‌ها">
          <label className="relative block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جست‌وجو در نام مسیر یا مؤسسه"
              aria-label="جست‌وجو در فرصت‌ها"
              className="w-full rounded-2xl border border-border bg-surface py-3 pr-11 pl-4 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="فیلتر نوع فرصت">
            {[
              { id: "all", label: "همه", count: trace.matches.length },
              { id: "primary", label: "بهترین تطابق‌ها", count: primary.length },
              { id: "near", label: "مسیرهای نزدیک", count: near.length },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id as typeof filter)}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs transition ${
                  filter === option.id
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label} <span className="num">{toDisplayDigits(option.count)}</span>
              </button>
            ))}
          </div>
        </section>
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

      {visibleMatches.length === 0 && trace.matches.length > 0 ? (
        <p
          className="rounded-3xl border border-border bg-surface p-5 text-center text-sm text-muted-foreground"
          role="status"
        >
          با این جست‌وجو یا فیلتر، فرصتی پیدا نشد.
        </p>
      ) : null}

      {visiblePrimary.length > 0 ? (
        <section className="space-y-3">
          <SectionTitle hint={`${toDisplayDigits(visiblePrimary.length)} مورد`}>
            بهترین تطابق‌ها
          </SectionTitle>
          {visiblePrimary.map((match, i) => (
            <OpportunityCard key={match.productId} match={match} rank={i} />
          ))}
        </section>
      ) : null}

      {visibleNear.length > 0 ? (
        <section className="space-y-3">
          <SectionTitle hint={`${toDisplayDigits(visibleNear.length)} مورد`}>
            مسیرهای نزدیک
          </SectionTitle>
          {visibleNear.map((match, i) => (
            <OpportunityCard key={match.productId} match={match} rank={i} />
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
