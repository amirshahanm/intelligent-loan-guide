import * as React from "react";
import type { IntentSlots } from "@/core/types";
import { discoverRouteFamilies, type CapabilityStatus, type ProductWorld } from "@/core/opportunity-routes";
import { universalNeedFromText } from "@/core/universal-need-extract";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/money";

const WORLD_FA: Record<ProductWorld, string> = {
  money: "نقدینگی",
  buy: "خرید",
  business: "کسب‌وکار",
  trade: "تجارت",
};

const STATUS_FA: Record<CapabilityStatus, string> = {
  ACTIVE: "فعال",
  COMING_SOON: "در حال آماده‌سازی",
  PARTNER_REQUIRED: "نیازمند شریک اجرایی",
  LICENSE_REQUIRED: "وابسته به مجوز/شریک",
};

function statusTone(status: CapabilityStatus): string {
  if (status === "ACTIVE") return "border-accent/40 bg-accent/10 text-accent";
  if (status === "COMING_SOON") return "border-signal/40 bg-signal/10 text-signal";
  return "border-gold/35 bg-gold/8 text-gold";
}

export function RouteReveal({ slots, needText }: { slots: IntentSlots; needText?: string | null }) {
  const need = React.useMemo(() => universalNeedFromText(needText, slots), [needText, slots]);
  const matches = React.useMemo(() => discoverRouteFamilies(need).slice(0, 3), [need]);

  if (matches.length === 0 || need.kind === "unknown") return null;

  const primary = matches[0];

  return (
    <section className="anim-resolve overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="border-b border-border bg-elevated/35 px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium text-accent">مسیر تشخیص‌داده‌شده</p>
            <h2 className="mt-1 text-sm font-bold text-foreground">
              اول «{WORLD_FA[primary.route.world]}» را بررسی می‌کنم، نه صرفاً یک وام.
            </h2>
          </div>
          <span className="num shrink-0 rounded-full border border-accent/30 bg-accent/8 px-2.5 py-1 text-xs font-bold text-accent">
            {toPersianDigits(primary.score)}٪
          </span>
        </div>
      </div>

      <div className="space-y-2 p-3 sm:p-4">
        {matches.map((match, index) => (
          <div
            key={match.route.id}
            className={cn(
              "relative rounded-2xl border px-4 py-3 transition-colors",
              index === 0 ? "border-accent/35 bg-accent/5" : "border-border bg-background/35",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-[10px] font-bold",
                  index === 0
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border bg-elevated text-muted-foreground",
                )}
              >
                {toPersianDigits(index + 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{match.route.titleFa}</h3>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[9px] font-medium",
                      statusTone(match.route.capabilityStatus),
                    )}
                  >
                    {STATUS_FA[match.route.capabilityStatus]}
                  </span>
                  {match.route.demo ? (
                    <span className="rounded-full border border-warn/35 bg-warn/8 px-2 py-0.5 text-[9px] text-warn">
                      معماری آزمایشی
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  {match.route.summaryFa}
                </p>
                {index === 0 ? (
                  <p className="mt-2 text-[11px] leading-5 text-foreground/75">{match.reasonFa}</p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border px-4 py-2.5 text-[10px] leading-5 text-muted-foreground sm:px-5">
        رتبه‌بندی مسیرها مستقل از درآمد تجاری پلتفرم است؛ مسیر بهتر برای کاربر بالاتر می‌ماند.
      </div>
    </section>
  );
}
