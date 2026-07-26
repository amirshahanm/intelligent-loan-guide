import * as React from "react";
import type { Provenance } from "@/core/types";
import { SOURCE_FA } from "@/core/labels";
import { faRelativeTime } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Provenance is displayed everywhere a fact is displayed. Mocked provider
 * facts always render their demo marker — mock data can never look verified.
 */
export function ProvenanceChip({
  provenance,
  className,
  showFreshness = true,
}: {
  provenance: Provenance;
  className?: string;
  showFreshness?: boolean;
}) {
  const tone =
    provenance.source === "provider_verified"
      ? "text-signal"
      : provenance.source === "catalog"
        ? "text-muted-foreground"
        : provenance.source === "derived"
          ? "text-accent"
          : "text-foreground/80";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-elevated/60 px-2 py-0.5 text-[10px] leading-4",
        tone,
        className,
      )}
    >
      <span>{SOURCE_FA[provenance.source]}</span>
      {provenance.demo ? <span className="text-warn">· نمونه</span> : null}
      {showFreshness ? (
        <span className="text-muted-foreground num">· {faRelativeTime(provenance.asOf)}</span>
      ) : null}
    </span>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">{children}</h2>
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export function AuthorityBadge({
  computedBy,
}: {
  computedBy: "client-preview" | "server-authoritative";
}) {
  const isServer = computedBy === "server-authoritative";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px]",
        isServer
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border bg-elevated/60 text-muted-foreground",
      )}
    >
      <span className={cn("size-1.5 rounded-full", isServer ? "bg-accent" : "bg-warn")} />
      {isServer ? "تأییدشده توسط موتور سرور" : "پیش‌نمایش لحظه‌ای — هنوز تأیید سرور نشده"}
    </span>
  );
}
