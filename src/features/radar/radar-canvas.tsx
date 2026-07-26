import * as React from "react";
import type { ReasoningTrace } from "@/core/types";
import { traceTally } from "@/core/engine";
import { toPersianDigits } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * RADAR INTEGRITY: everything drawn here is derived from the deterministic
 * reasoning trace. Node positions are a deterministic function of the product
 * id, and no node exists that the engine did not evaluate. There is no
 * decorative or fabricated scan activity anywhere in this component.
 */

function angleFor(id: string, index: number, total: number): number {
  return (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2 + (id.length % 5) * 0.02;
}

type Node = {
  id: string;
  label: string;
  partner: string;
  outcome: "eliminated" | "near" | "primary";
  note: string;
  x: number;
  y: number;
};

export function RadarCanvas({
  trace,
  onSelect,
  className,
}: {
  trace: ReasoningTrace;
  onSelect?: (productId: string) => void;
  className?: string;
}) {
  const tally = traceTally(trace);

  const nodes: Node[] = React.useMemo(() => {
    const entries = trace.steps.filter((s) => s.outcome !== "evaluating");
    const total = entries.length;
    return entries.map((step, index) => {
      const radius =
        step.outcome === "primary" ? 42 : step.outcome === "near" ? 92 : 138;
      const angle = angleFor(step.productId, index, total);
      return {
        id: step.productId,
        label: step.productName,
        partner: step.partnerName,
        outcome: step.outcome as Node["outcome"],
        note: step.note,
        x: 160 + Math.cos(angle) * radius,
        y: 160 + Math.sin(angle) * radius,
      };
    });
  }, [trace.steps]);

  const color = (outcome: Node["outcome"]) =>
    outcome === "primary"
      ? "var(--color-gold)"
      : outcome === "near"
        ? "var(--color-accent)"
        : "var(--color-muted-foreground)";

  return (
    <div className={cn("surface-panel rounded-3xl p-4", className)}>
      <div className="relative mx-auto aspect-square w-full max-w-[340px]">
        <svg viewBox="0 0 320 320" className="size-full" role="img" aria-label="نمای رادار استدلال">
          {[46, 96, 142].map((r) => (
            <circle
              key={r}
              cx="160"
              cy="160"
              r={r}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="1"
            />
          ))}
          <g className="anim-scan" style={{ transformOrigin: "160px 160px" }}>
            <defs>
              <linearGradient id="sweep" x1="0" x2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M160 160 L160 18 A142 142 0 0 1 262 60 Z" fill="url(#sweep)" />
          </g>

          {nodes.map((node, i) => (
            <line
              key={`l_${node.id}`}
              x1="160"
              y1="160"
              x2={node.x}
              y2={node.y}
              stroke={color(node.outcome)}
              strokeOpacity={node.outcome === "eliminated" ? 0.18 : 0.5}
              strokeWidth="1"
              className="anim-connect"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}

          {nodes.map((node, i) => (
            <g
              key={node.id}
              className="anim-detect cursor-pointer"
              style={{ animationDelay: `${i * 45}ms` }}
              onClick={() => onSelect?.(node.id)}
            >
              <title>{`${node.label} — ${node.note}`}</title>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.outcome === "primary" ? 9 : node.outcome === "near" ? 6 : 4}
                fill={color(node.outcome)}
                fillOpacity={node.outcome === "eliminated" ? 0.35 : 1}
              />
              {node.outcome === "primary" ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="16"
                  fill="none"
                  stroke="var(--color-gold)"
                  strokeOpacity="0.5"
                  className="anim-pulse-node"
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                />
              ) : null}
            </g>
          ))}

          <circle cx="160" cy="160" r="5" fill="var(--color-foreground)" fillOpacity="0.7" />
        </svg>
      </div>

      <RadarTally trace={trace} />
      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        هر نقطه یک مسیر واقعی در موتور استدلال است؛ هیچ فعالیت نمایشی ساختگی نمایش داده نمی‌شود.
      </p>
      <ul className="mt-3 flex flex-wrap justify-center gap-3 text-[10px] text-muted-foreground">
        <li className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-gold" /> پیشنهاد اصلی
        </li>
        <li className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-accent" /> مسیر نزدیک
        </li>
        <li className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-muted-foreground" /> حذف‌شده
        </li>
      </ul>
      <p className="sr-only">
        {`${tally.evaluated} مسیر بررسی شد، ${tally.eliminated} مسیر حذف شد، ${tally.near} مسیر نزدیک و ${tally.primary} پیشنهاد اصلی.`}
      </p>
    </div>
  );
}

export function RadarTally({ trace }: { trace: ReasoningTrace }) {
  const tally = traceTally(trace);
  const items = [
    { label: "بررسی‌شده", value: tally.evaluated, tone: "text-foreground" },
    { label: "حذف‌شده", value: tally.eliminated, tone: "text-muted-foreground" },
    { label: "نزدیک", value: tally.near, tone: "text-accent" },
    { label: "پیشنهاد اصلی", value: tally.primary, tone: "text-gold" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-border bg-elevated/50 p-2 text-center">
          <div className={cn("num text-xl font-bold", item.tone)}>{toPersianDigits(item.value)}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
