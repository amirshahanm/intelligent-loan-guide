import { Link } from "@tanstack/react-router";
import type { Match } from "@/core/types";
import { faDays, faMonths, faPercent, formatTomanCompact, toPersianDigits } from "@/lib/money";
import { ProvenanceChip } from "@/components/provenance";
import { catalogFact } from "@/core/types";
import { cn } from "@/lib/utils";

export function FitRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="num rotate-90 fill-foreground text-[13px] font-bold"
        style={{ transformOrigin: "center" }}
      >
        {toPersianDigits(Math.round(score))}
      </text>
    </svg>
  );
}

/**
 * An opportunity, not a listing: reachable amount, why it matched, what is
 * missing, and the single next action that moves it forward.
 */
export function OpportunityCard({ match, rank }: { match: Match; rank: number }) {
  const primary = match.tier === "primary";
  return (
    <article
      className={cn(
        "anim-resolve rounded-3xl border bg-surface p-4",
        primary ? "border-gold/40 glow-gold" : "border-border",
      )}
      style={{ animationDelay: `${rank * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <FitRing score={match.fitScore} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-foreground">{match.productName}</h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px]",
                primary ? "bg-gold/15 text-gold" : "bg-accent/10 text-accent",
              )}
            >
              {primary ? "بهترین تطابق" : "مسیر نزدیک"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{match.partnerName}</p>
          <div className="mt-2">
            <div className="text-[10px] text-muted-foreground">سقف قابل دسترس برای تو</div>
            <div className="num text-xl font-extrabold text-gold">
              {formatTomanCompact(match.reachableAmount)}
            </div>
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="نرخ سالانه" value={faPercent(match.ratePercent)} />
        <Stat label="حداکثر بازپرداخت" value={faMonths(match.maxTermMonths)} />
        <Stat label="زمان تا دریافت" value={faDays(match.typicalDays)} />
      </dl>

      {match.matchedBecause.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {match.matchedBecause.slice(0, 3).map((reason) => (
            <li key={reason} className="flex gap-2 text-xs text-foreground/85">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
              {reason}
            </li>
          ))}
        </ul>
      ) : null}

      {match.gaps.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-border bg-elevated/50 p-3">
          <div className="text-[10px] text-warn">برای نزدیک‌تر شدن</div>
          <ul className="mt-1 space-y-1">
            {match.gaps.slice(0, 2).map((gap) => (
              <li key={gap.ruleId} className="text-xs text-muted-foreground">
                {gap.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <ProvenanceChip provenance={catalogFact(match.asOf)} />
        <Link
          to="/opportunity/$productId"
          params={{ productId: match.productId }}
          className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
        >
          دیدن دلیل و قدم بعدی
        </Link>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated/50 p-2">
      <dd className="num text-sm font-bold text-foreground">{value}</dd>
      <dt className="mt-0.5 text-[10px] text-muted-foreground">{label}</dt>
    </div>
  );
}
