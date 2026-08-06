import * as React from "react";
import type { Question } from "@/core/questions";
import { fromToman, toLatinDigits, toPersianDigits } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * The engine decides which question is asked. This component only renders it.
 * One question per screen on mobile, thumb-reachable options.
 */
export function QuestionCard({
  question,
  onAnswer,
  index,
  selected,
  onBack,
}: {
  question: Question;
  onAnswer: (value: string | number, label: string) => void;
  index: number;
  selected?: string | number;
  onBack?: () => void;
}) {
  const [amountText, setAmountText] = React.useState("");

  const amountIrr = React.useMemo(() => {
    const raw = Number(toLatinDigits(amountText).replace(/[^\d]/g, ""));
    return Number.isFinite(raw) && raw > 0 ? fromToman(raw * 1_000_000) : null;
  }, [amountText]);

  return (
    <div className="anim-resolve rounded-3xl border border-border bg-surface p-4">
      <div className="mb-1 text-[10px] text-accent">
        پرسش {toPersianDigits(index)} · موتور تصمیم
      </div>
      <div className="text-base font-semibold text-foreground">{question.text}</div>
      {question.helper ? (
        <p className="mt-1 text-xs text-muted-foreground">{question.helper}</p>
      ) : null}

      {question.kind === "amount" ? (
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (amountIrr) onAnswer(amountIrr, `${amountText} میلیون تومان`);
          }}
        >
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-input bg-background px-3 py-2">
            <input
              inputMode="numeric"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="مثلاً ۳۰۰"
              className="num w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
              aria-label="مبلغ به میلیون تومان"
            />
            <span className="shrink-0 text-xs text-muted-foreground">میلیون تومان</span>
          </div>
          <button
            type="submit"
            disabled={!amountIrr}
            className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-40"
          >
            ثبت
          </button>
        </form>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {question.options?.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(option.value, option.label)}
              className={cn(
                "rounded-2xl border border-border bg-elevated px-3 py-3 text-sm text-foreground transition-colors",
                "hover:border-accent/60 hover:bg-accent/10",
                selected === option.value && "border-accent bg-accent/15 text-accent",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mt-3 rounded-2xl border border-border bg-elevated px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent/60 hover:text-foreground"
        >
          مرحله قبل
        </button>
      ) : null}
    </div>
  );
}
