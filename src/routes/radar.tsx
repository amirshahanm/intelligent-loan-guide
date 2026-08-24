import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RadarCanvas } from "@/features/radar/radar-canvas";
import { ReadinessPanel } from "@/features/readiness/readiness-panel";
import { AuthorityBadge, SectionTitle } from "@/components/provenance";
import { useAuthoritativeTrace } from "@/hooks/use-authoritative-trace";
import { useSession } from "@/lib/session";
import { toPersianDigits } from "@/lib/money";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "رادار استدلال — تسهیل‌رادار" },
      {
        name: "description",
        content:
          "رادار زنده مسیرهای بررسی‌شده، حذف‌شده و نزدیک را نشان می‌دهد؛ هر نقطه یک تصمیم واقعی موتور استدلال است.",
      },
      { property: "og:title", content: "رادار استدلال تسهیل‌رادار" },
      {
        property: "og:description",
        content: "ببین کدام مسیرها بررسی شد، کدام حذف شد و چرا.",
      },
    ],
  }),
  component: RadarPage,
});

function RadarPage() {
  const { state, hydrated } = useSession();
  const { trace, confirmed } = useAuthoritativeTrace();

  if (!hydrated) return <AppShell>{null}</AppShell>;

  if (state.messages.length === 0) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  return (
    <AppShell className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">رادار استدلال</h1>
        <AuthorityBadge computedBy={confirmed ? "server-authoritative" : trace.computedBy} />
      </div>

      <RadarCanvas trace={trace} />

      <ReadinessPanel readiness={trace.readiness} />

      <section>
        <SectionTitle hint={`${toPersianDigits(trace.eliminated.length)} مسیر`}>
          چرا این مسیرها حذف شدند
        </SectionTitle>
        {trace.eliminated.length === 0 ? (
          <p className="rounded-3xl border border-border bg-surface p-4 text-xs text-muted-foreground">
            هنوز مسیری حذف نشده است. هرچه اطلاعات بیشتری بدهی، جداسازی دقیق‌تر می‌شود.
          </p>
        ) : (
          <ul className="space-y-2">
            {trace.eliminated.map((path) => (
              <li key={path.productId} className="rounded-3xl border border-border bg-surface p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground/80">
                    {path.productName}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{path.partnerName}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {path.reasons.map((reason) => (
                    <li key={reason.ruleId} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger/70" />
                      <span>{reason.message}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle>قدم‌های بعدی که بیشترین اثر را دارند</SectionTitle>
        <ul className="space-y-2">
          {trace.nextActions.map((action) => (
            <li key={action.id} className="rounded-3xl border border-border bg-surface p-4">
              <div className="text-sm font-semibold">{action.label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>
              {action.unlocks ? (
                <p className="mt-1 text-[11px] text-accent">{action.unlocks}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <Link
        to="/opportunities"
        className="block rounded-2xl bg-gold px-4 py-3 text-center text-sm font-semibold text-gold-foreground"
      >
        دیدن فرصت‌ها
      </Link>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 text-center">
      <h1 className="text-base font-bold">هنوز چیزی برای اسکن نیست</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        اول بگو چه می‌خواهی تا رادار مسیرهای واقعی را بسنجد.
      </p>
      <Link
        to="/"
        className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
      >
        شروع گفت‌وگو
      </Link>
    </div>
  );
}
