import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { extractSlots, mergeSlots } from "@/core/extract";
import { hasCoreSlots, isAssessmentComplete, nextQuestion, QUESTIONS } from "@/core/questions";
import type { IntentSlots, SlotKey } from "@/core/types";
import { fact, userStated } from "@/core/types";
import { messageId, useSession, slotKeys } from "@/lib/session";
import { track } from "@/lib/analytics";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useAuthoritativeTrace } from "@/hooks/use-authoritative-trace";
import { SlotChips } from "./slot-chips";
import { QuestionCard } from "./question-card";
import { AuthorityBadge } from "@/components/provenance";
import { RadarTally } from "@/features/radar/radar-canvas";
import { toPersianDigits } from "@/lib/money";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "۳۰۰ میلیون برای راه‌اندازی کارگاه می‌خوام، کارمندم و ضامن دارم",
  "می‌خوام ماشین بخرم، آزادکارم، وثیقه ندارم",
  "۵۰ میلیون فوری لازم دارم برای هزینهٔ درمان",
];

/** Deterministic acknowledgement — never invents a fact the engine didn't get. */
function acknowledge(filled: SlotKey[], unclear: boolean): string {
  if (unclear) return "متوجه شدم ضامن داری. فقط بگو ضامن کارمند رسمی است یا صاحب کسب‌وکار.";
  if (filled.length === 0)
    return "چیزی که نوشتی را ثبت کردم، ولی هنوز داده‌ای برای تصمیم‌گیری از آن درنیامد. با چند پرسش کوتاه پیش می‌رویم.";
  return `${toPersianDigits(filled.length)} نکته از حرفت برداشت کردم. برای اینکه مسیرهای واقعی را جدا کنم، چند چیز دیگر لازم دارم.`;
}

export function ConciergeExperience() {
  const { state, update, hydrated } = useSession();
  const { trace, confirming, confirmed } = useAuthoritativeTrace();
  const navigate = useNavigate();
  const [draft, setDraft] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  const started = state.messages.length > 0;

  const applyText = React.useCallback(
    (text: string, channel: "typed" | "voice") => {
      const trimmed = text.trim();
      if (!trimmed) return;
      track({ name: "intent_started", channel });

      const { slots: extracted, filled, guarantorTypeUnclear } = extractSlots(trimmed);
      track({ name: "intent_parsed", slotsFilled: filled.length, slots: filled });
      for (const slot of filled) track({ name: "slot_updated", slot, source: "extraction" });

      update((s) => {
        const merged = mergeSlots(s.slots, extracted);
        const question = nextQuestion(merged, s.askedQuestionIds);
        if (question) track({ name: "question_asked", questionId: question.id, slot: question.slot });
        track({ name: "reasoning_started", slotCount: slotKeys(merged).length });
        return {
          ...s,
          status: s.status === "ANONYMOUS" ? "ENGAGED" : s.status,
          slots: merged,
          intents: [
            ...s.intents,
            { id: messageId(), text: trimmed, channel, at: new Date().toISOString() },
          ],
          askedQuestionIds: question
            ? [...s.askedQuestionIds, question.id]
            : s.askedQuestionIds,
          messages: [
            ...s.messages,
            { id: messageId(), role: "user", kind: "text", text: trimmed, channel },
            {
              id: messageId(),
              role: "concierge",
              kind: "text",
              text: acknowledge(filled, guarantorTypeUnclear),
            },
            ...(question
              ? ([
                  {
                    id: messageId(),
                    role: "concierge",
                    kind: "question",
                    questionId: question.id,
                  },
                ] as const)
              : []),
          ],
        };
      });
      setDraft("");
    },
    [update],
  );

  const voice = useVoiceInput((text) => applyText(text, "voice"));

  const answer = React.useCallback(
    (questionId: string, value: string | number, label: string) => {
      const question = QUESTIONS.find((q) => q.id === questionId);
      if (!question) return;
      track({ name: "slot_updated", slot: question.slot, source: "answer" });

      update((s) => {
        const merged: IntentSlots = {
          ...s.slots,
          [question.slot]: fact(value as never, userStated(0.95)),
        };
        const upcoming = nextQuestion(merged, s.askedQuestionIds);
        if (upcoming) track({ name: "question_asked", questionId: upcoming.id, slot: upcoming.slot });
        return {
          ...s,
          slots: merged,
          askedQuestionIds: upcoming ? [...s.askedQuestionIds, upcoming.id] : s.askedQuestionIds,
          messages: [
            ...s.messages,
            { id: messageId(), role: "user", kind: "text", text: label, channel: "typed" },
            ...(upcoming
              ? ([
                  { id: messageId(), role: "concierge", kind: "question", questionId: upcoming.id },
                ] as const)
              : ([
                  {
                    id: messageId(),
                    role: "concierge",
                    kind: "text",
                    text: "بررسی کامل شد. یک پیشنهاد اصلی و سه مسیر نزدیک برای پرونده‌ات پیدا کردم.",
                  },
                ] as const)),
          ],
        };
      });
    },
    [update],
  );

  const goBack = React.useCallback(() => {
    update((s) => {
      const asked = s.askedQuestionIds;
      if (asked.length === 0) return s;
      const lastQ = QUESTIONS.find((q) => q.id === asked[asked.length - 1]);
      const lastAnswered = lastQ ? s.slots[lastQ.slot] !== undefined : false;
      const targetIdx = lastAnswered ? asked.length - 1 : asked.length - 2;
      if (targetIdx < 0) return s;
      const targetId = asked[targetIdx];
      const slots: IntentSlots = { ...s.slots };
      for (const id of asked.slice(targetIdx + 1)) {
        const q = QUESTIONS.find((x) => x.id === id);
        if (q) delete slots[q.slot];
      }
      const at = s.messages.findIndex(
        (m) => m.role === "concierge" && m.kind === "question" && m.questionId === targetId,
      );
      return {
        ...s,
        slots,
        askedQuestionIds: asked.slice(0, targetIdx + 1),
        messages: at >= 0 ? s.messages.slice(0, at + 1) : s.messages,
      };
    });
  }, [update]);

  const reAsk = React.useCallback(
    (key: SlotKey) => {
      const question = QUESTIONS.find((q) => q.slot === key);
      if (!question) return;
      update((s) => ({
        ...s,
        messages: [
          ...s.messages,
          { id: messageId(), role: "concierge", kind: "question", questionId: question.id },
        ],
      }));
    },
    [update],
  );

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.messages.length]);

  const ready = hasCoreSlots(state.slots);
  const complete = isAssessmentComplete(state.slots);
  const [analyzing, setAnalyzing] = React.useState(false);
  const wasComplete = React.useRef(false);

  React.useEffect(() => {
    if (complete && !wasComplete.current) {
      wasComplete.current = true;
      setAnalyzing(true);
      const t = setTimeout(() => setAnalyzing(false), 1800);
      return () => clearTimeout(t);
    }
    if (!complete) wasComplete.current = false;
  }, [complete]);

  const canGoBack = React.useMemo(() => {
    const asked = state.askedQuestionIds;
    if (asked.length === 0) return false;
    const lastQ = QUESTIONS.find((q) => q.id === asked[asked.length - 1]);
    const lastAnswered = lastQ ? state.slots[lastQ.slot] !== undefined : false;
    return (lastAnswered ? asked.length - 1 : asked.length - 2) >= 0;
  }, [state.askedQuestionIds, state.slots]);

  const lastQuestionId = React.useMemo(() => {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      const m = state.messages[i];
      if (m.role === "concierge" && m.kind === "question") return m.questionId;
    }
    return null;
  }, [state.messages]);

  if (!hydrated) {
    return <div className="h-[60vh] animate-pulse rounded-3xl border border-border bg-surface" />;
  }

  return (
    <div className="space-y-5">
      {!started ? (
        <section className="anim-resolve pt-6 text-center">
          <p className="text-xs text-accent">ناوبر هوشمند وام و اعتبار</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            بگو چه می‌خواهی.
            <br />
            <span className="text-gold">مسیرِ واقعی‌اش را نشانت می‌دهم.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            بدون ثبت‌نام، بدون فرم بلند. یک جمله بنویس یا بگو؛ من مسیرهای موجود را می‌سنجم، آنچه
            بسته است را حذف می‌کنم و دلیل هر تصمیم را نشانت می‌دهم.
          </p>
        </section>
      ) : null}

      {started ? (
        <div className="space-y-3">
          {state.messages.map((message) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-start">
                  <div className="anim-resolve max-w-[85%] rounded-3xl rounded-ss-md bg-signal/15 px-4 py-2.5 text-sm text-foreground">
                    {message.text}
                    {message.channel === "voice" ? (
                      <span className="ms-2 text-[10px] text-muted-foreground">صوتی</span>
                    ) : null}
                  </div>
                </div>
              );
            }
            if (message.kind === "text") {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="anim-resolve max-w-[85%] rounded-3xl rounded-se-md border border-border bg-surface px-4 py-2.5 text-sm text-foreground">
                    {message.text}
                  </div>
                </div>
              );
            }
            if (message.kind === "question") {
              const question = QUESTIONS.find((q) => q.id === message.questionId);
              if (!question) return null;
              const answered = state.slots[question.slot] !== undefined;
              const index = state.askedQuestionIds.indexOf(question.id) + 1;
              if (answered && message.questionId !== lastQuestionId) return null;
              return (
                <QuestionCard
                  key={message.id}
                  question={question}
                  index={index > 0 ? index : 1}
                  selected={state.slots[question.slot]?.value as string | number | undefined}
                  onBack={
                    canGoBack && message.questionId === lastQuestionId ? goBack : undefined
                  }
                  onAnswer={(value, label) => answer(question.id, value, label)}
                />
              );
            }
            return null;
          })}
          <div ref={endRef} />
        </div>
      ) : null}

      <SlotChips slots={state.slots} onEdit={reAsk} />

      {complete ? null : (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyText(draft, "typed");
        }}
        className="sticky bottom-3 z-20"
      >
        <div className="flex items-end gap-2 rounded-3xl border border-border bg-surface/95 p-2 backdrop-blur-xl">
          <textarea
            value={voice.listening ? voice.interim : draft}
            onChange={(e) => setDraft(e.target.value)}
            readOnly={voice.listening}
            rows={2}
            placeholder={voice.listening ? "در حال شنیدن…" : "مثلاً: ۲۰۰ میلیون برای خرید ماشین"}
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="خواسته‌ات را بنویس"
          />
          {voice.supported ? (
            <button
              type="button"
              onClick={voice.listening ? voice.stop : voice.start}
              aria-label={voice.listening ? "پایان ضبط" : "گفتن با صدا"}
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-2xl border transition-colors",
                voice.listening
                  ? "border-danger/50 bg-danger/15 text-danger"
                  : "border-border bg-elevated text-muted-foreground hover:text-foreground",
              )}
            >
              <MicIcon />
            </button>
          ) : null}
          <button
            type="submit"
            disabled={!draft.trim()}
            className="h-11 shrink-0 rounded-2xl bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-40"
          >
            بفرست
          </button>
        </div>
        {voice.supported ? (
          <p className="mt-1 px-2 text-[10px] text-muted-foreground">
            صدا فقط در مرورگر خودت پردازش می‌شود و هیچ فایل صوتی ذخیره یا ارسال نمی‌شود.
          </p>
        ) : null}
      </form>
      )}

      {!started ? (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">یا یکی از این‌ها را امتحان کن:</p>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => applyText(example, "typed")}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-start text-sm text-foreground/90 transition-colors hover:border-accent/50"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}

      {analyzing ? (
        <p className="anim-resolve rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm text-muted-foreground">
          در حال تحلیل توان بازپرداخت، اعتبار و فرصت‌های مناسب…
        </p>
      ) : null}

      {complete && !analyzing ? (
        <section className="space-y-3">
          <AuthorityBadge computedBy={confirmed ? "server-authoritative" : trace.computedBy} />
          <RadarTally trace={trace} />
          <div className="flex gap-2">
            {canGoBack ? (
              <button
                type="button"
                onClick={goBack}
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted-foreground"
              >
                مرحله قبل
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate({ to: "/radar" })}
              className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold"
            >
              دیدن رادار استدلال
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={() => navigate({ to: "/opportunities" })}
              className="flex-1 rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-gold-foreground disabled:opacity-40"
            >
              {ready ? "دیدن فرصت‌ها" : "چند پرسش دیگر مانده"}
            </button>
          </div>
          {confirming ? (
            <p className="text-center text-[11px] text-muted-foreground">
              در حال تأیید نتیجه با موتور سرور…
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
    </svg>
  );
}
