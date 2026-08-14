import * as React from "react";
import { scoreLeadLiquidity, type LiquidityFactorKey, type LiquidityInput } from "@/core/liquidity";
import {
  knownLiquidityFacts,
  liquidityNextAction,
  nextLiquidityQuestion,
  type LiquidityAnswer,
} from "@/core/liquidity-journey";
import { track } from "@/lib/analytics";
import { useSession } from "@/lib/session";
import { toPersianDigits } from "@/lib/money";
import { cn } from "@/lib/utils";

export function LiquidityJourney() {
  const { state, update } = useSession();
  const input = React.useMemo(
    () => ({
      ...knownLiquidityFacts(state.slots, Boolean(state.creditResult)),
      ...state.liquidity,
    }),
    [state.slots, state.creditResult, state.liquidity],
  );
  const result = React.useMemo(() => scoreLeadLiquidity(input), [input]);
  const question = nextLiquidityQuestion(input, state.liquiditySkippedFactors);
  const action = liquidityNextAction(result);
  const started = React.useRef(false);
  const viewed = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    track({
      name: "liquidity_started",
      knownCount: result.factors.filter((factor) => factor.known).length,
    });
  }, [result.factors]);

  React.useEffect(() => {
    const signature = `${result.status}:${result.total}`;
    if (viewed.current === signature) return;
    viewed.current = signature;
    track({
      name: "liquidity_result_viewed",
      status: result.status,
    });
    track({ name: "liquidity_next_action_viewed", factor: action.key });
  }, [action.key, result.status, result.total]);

  React.useEffect(() => {
    if (!question || state.liquidityAskedFactors.includes(question.key)) return;
    update((current) => ({
      ...current,
      liquidityAskedFactors: [...current.liquidityAskedFactors, question.key],
    }));
    track({ name: "liquidity_factor_asked", factor: question.key });
  }, [question, state.liquidityAskedFactors, update]);

  const answer = (key: LiquidityFactorKey, value: LiquidityAnswer) => {
    update((current) => ({
      ...current,
      liquidity: { ...current.liquidity, [key]: value } as LiquidityInput,
      liquiditySkippedFactors: current.liquiditySkippedFactors.filter((factor) => factor !== key),
    }));
    track({
      name: "liquidity_factor_answered",
      factor: key,
      answer: value === false ? "negative" : value === true ? "positive" : "clarified",
    });
  };

  const skip = (key: LiquidityFactorKey) => {
    update((current) => ({
      ...current,
      liquiditySkippedFactors: current.liquiditySkippedFactors.includes(key)
        ? current.liquiditySkippedFactors
        : [...current.liquiditySkippedFactors, key],
    }));
    track({ name: "liquidity_factor_answered", factor: key, answer: "skipped" });
  };

  return (
    <div className="space-y-5">
      <section className="surface-panel overflow-hidden rounded-3xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-accent">آمادگی اجرا · مستقل از تطبیق و اعتبار</p>
            <h1 className="mt-1 text-xl font-bold">پرونده چقدر برای اقدام روشن است؟</h1>
          </div>
          <div className="text-center">
            <div className="num text-4xl font-black text-accent">
              {toPersianDigits(result.total)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              از {toPersianDigits(result.maxScore)}
            </div>
          </div>
        </div>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-elevated"
          aria-label={`امتیاز ${result.total} از ۱۰۰`}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${result.total}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
            {result.statusLabel}
          </span>
          <span className="text-[11px] text-muted-foreground">
            این وضعیت رد، تأیید یا تضمین دریافت وام نیست.
          </span>
        </div>
      </section>

      {question ? (
        <section
          key={question.key}
          className="anim-resolve rounded-3xl border border-signal/35 bg-surface p-5"
        >
          <div className="text-[10px] text-signal">پرسش بعدی · فقط یک واقعیت ناشناخته</div>
          <h2 className="mt-2 text-base font-bold">{question.text}</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">{question.helper}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {question.options.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => answer(question.key, option.value)}
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground"
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => skip(question.key)}
            className="mt-3 w-full rounded-2xl border border-border px-4 py-3 text-xs font-semibold text-muted-foreground"
          >
            فعلاً نامشخص است
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            با رد کردن، امتیازی کم نمی‌شود؛ این فاکتور نامشخص می‌ماند و بعداً قابل پاسخ است.
          </p>
        </section>
      ) : result.missingFactors.length === 0 ? (
        <section className="anim-resolve rounded-3xl border border-accent/35 bg-accent/10 p-5">
          <p className="text-sm font-bold text-accent">همهٔ فاکتورهای آمادگی اجرا روشن‌اند</p>
          <p className="mt-1 text-xs text-muted-foreground">
            پرونده حذف نمی‌شود و پاسخ‌ها را هر زمان می‌توانی بازبینی کنی.
          </p>
        </section>
      ) : (
        <section className="anim-resolve rounded-3xl border border-signal/35 bg-signal/10 p-5">
          <p className="text-sm font-bold text-signal">پرسش‌های باقی‌مانده فعلاً رد شده‌اند</p>
          <p className="mt-1 text-xs text-muted-foreground">
            این فاکتورها همچنان نامشخص و بدون امتیازند؛ از فهرست زیر هرکدام را خواستی بازبینی کن.
          </p>
        </section>
      )}

      <section className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="text-sm font-bold">بهترین اقدام بعدی</h2>
        <p className="mt-2 text-base font-semibold text-foreground">{action.label}</p>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">{action.detail}</p>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold">ریز فاکتورها</h2>
          <span className="text-[11px] text-muted-foreground">
            {toPersianDigits(result.missingFactors.length)} مورد نامشخص
          </span>
        </div>
        <ul className="mt-4 space-y-3">
          {result.factors.map((factor) => (
            <li key={factor.key} className="rounded-2xl bg-elevated/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{factor.label}</span>
                <span
                  className={cn(
                    "num text-xs",
                    factor.known ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  +{toPersianDigits(factor.awarded)} / {toPersianDigits(factor.weight)}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{factor.reason}</p>
              {!factor.known && state.liquiditySkippedFactors.includes(factor.key) ? (
                <button
                  type="button"
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      liquiditySkippedFactors: current.liquiditySkippedFactors.filter(
                        (key) => key !== factor.key,
                      ),
                    }))
                  }
                  className="mt-2 text-[10px] text-signal"
                >
                  پاسخ دادن به این فاکتور
                </button>
              ) : null}
              {factor.known &&
              !(factor.key in knownLiquidityFacts(state.slots, Boolean(state.creditResult))) ? (
                <button
                  type="button"
                  onClick={() =>
                    update((current) => {
                      const next = { ...current.liquidity };
                      delete next[factor.key];
                      return { ...current, liquidity: next };
                    })
                  }
                  className="mt-2 text-[10px] text-signal"
                >
                  بازبینی پاسخ
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {result.missingFactors.length ? (
        <section className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-sm font-bold">فاکتورهای نامشخص</h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {result.missingFactors
              .map((key) => result.factors.find((factor) => factor.key === key)!.label)
              .join("، ")}
          </p>
        </section>
      ) : null}
    </div>
  );
}
