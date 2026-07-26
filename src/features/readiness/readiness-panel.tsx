import type { Readiness } from "@/core/types";
import { DIMENSION_FA } from "@/core/labels";
import { toPersianDigits } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Readiness is a diagnosis, never a verdict — every low score names its fix. */
export function ReadinessPanel({ readiness }: { readiness: Readiness }) {
  const tone =
    readiness.total >= 70 ? "text-accent" : readiness.total >= 40 ? "text-warn" : "text-danger";

  return (
    <section className="surface-panel rounded-3xl p-4">
      <div className="flex items-center gap-4">
        <div className="relative grid size-20 shrink-0 place-items-center">
          <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-border)" strokeWidth="6" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={2 * Math.PI * 34 * (1 - readiness.total / 100)}
            />
          </svg>
          <span className={cn("num absolute text-lg font-extrabold", tone)}>
            {toPersianDigits(readiness.total)}
          </span>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">آمادگی پرونده</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            این عدد قضاوت دربارهٔ تو نیست؛ نشان می‌دهد پرونده‌ات چقدر برای بررسی کامل است و کدام
            بخش را می‌شود بهتر کرد.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {readiness.dimensions.map((dimension) => (
          <li key={dimension.dimension}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-foreground">{DIMENSION_FA[dimension.dimension]}</span>
              <span className="num text-muted-foreground">{toPersianDigits(dimension.score)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  dimension.score >= 70
                    ? "bg-accent"
                    : dimension.score >= 40
                      ? "bg-signal"
                      : "bg-warn",
                )}
                style={{ width: `${Math.max(4, dimension.score)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {dimension.blocker ?? dimension.label}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
