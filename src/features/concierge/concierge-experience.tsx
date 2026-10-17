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
import { formatTomanCompact, toDisplayDigits } from "@/lib/money";
import { purchaseBudget } from "@/core/purchase-budget";
import { cn } from "@/lib/utils";
import { ReasoningNotice } from "@/components/reasoning-notice";
import { converseWithBrain, getBrainAvailability } from "@/lib/brain.functions";
import { safeSource } from "@/lib/brain-policy";

/** Deterministic acknowledgement — never invents a fact the engine didn't get. */
function acknowledge(filled: SlotKey[], unclear: boolean): string {
  if (unclear) return "متوجه شدم ضامن داری. فقط بگو ضامن کارمند رسمی است یا صاحب کسب‌وکار.";
  if (filled.length === 0)
    return "چیزی که نوشتی را ثبت کردم، ولی هنوز داده‌ای برای تصمیم‌گیری از آن درنیامد. با چند پرسش کوتاه پیش می‌رویم.";
  return `${toDisplayDigits(filled.length)} نکته از حرفت برداشت کردم. برای اینکه مسیرهای واقعی را جدا کنم، چند چیز دیگر لازم دارم.`;
}

function budgetSummary(slots: IntentSlots): string {
  const budget = purchaseBudget(slots);
  if (budget.status === "conflict")
    return " بودجهٔ خرید از سرمایهٔ اعلام‌شده بیشتر است؛ پیش از ادامه، این دو مبلغ را اصلاح کن.";
  if (budget.status !== "calculated") return "";
  const retained =
    budget.retainedCapitalIrr === null
      ? ""
      : ` سرمایهٔ باقی‌مانده پس از کنارگذاشتن بودجهٔ خرید: ${formatTomanCompact(budget.retainedCapitalIrr)}.`;
  const next =
    budget.fundingGapIrr === 0
      ? " مبلغ هدف در بودجهٔ اعلام‌شده جا می‌گیرد؛ بررسی قیمت واقعی، هزینه‌های جانبی و شرایط فروش هنوز لازم است."
      : " برای بررسی تأمین این فاصله، مبلغ تسهیلات مورد نظر و توان پرداخت ماهانهٔ خودت را جدا ثبت می‌کنیم.";
  return ` فاصلهٔ مبلغ هدف تا بودجهٔ خرید: ${formatTomanCompact(budget.fundingGapIrr)}.${retained}${next} این محاسبه فقط از گفته‌های توست؛ نه قیمت بازار، رتبهٔ اعتباری یا تأیید تسهیلات.`;
}

export function ConciergeExperience({
  suggestedNeed,
  suggestionLabel = "استفاده از انتخاب‌های خودرو در متن نیاز",
}: { suggestedNeed?: string; suggestionLabel?: string } = {}) {
  const { state, update, hydrated } = useSession();
  const { trace, confirming, confirmed } = useAuthoritativeTrace();
  const navigate = useNavigate();
  const [draft, setDraft] = React.useState("");
  const [draftChannel, setDraftChannel] = React.useState<"typed" | "voice">("typed");
  const voicePrefix = React.useRef("");
  const [composingNewNeed, setComposingNewNeed] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const [brainAvailable, setBrainAvailable] = React.useState(false);
  const [brainConsent, setBrainConsent] = React.useState(false);
  const [brainSearch, setBrainSearch] = React.useState(false);
  const [brainBusy, setBrainBusy] = React.useState(false);
  const [brainError, setBrainError] = React.useState("");
  const brainPending = React.useRef(false);

  React.useEffect(() => {
    let active = true;
    getBrainAvailability()
      .then((result) => {
        if (active) setBrainAvailable(result.enabled);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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
        const budgetNote =
          budgetSummary(merged) ||
          (extracted.availableCapital
            ? " این مبلغ را سرمایهٔ موجود ثبت کردم، نه درخواست وام."
            : "");
        if (question)
          track({ name: "question_asked", questionId: question.id, slot: question.slot });
        track({ name: "reasoning_started", slotCount: slotKeys(merged).length });
        return {
          ...s,
          status: s.status === "ANONYMOUS" ? "ENGAGED" : s.status,
          slots: merged,
          intents: [
            ...s.intents,
            { id: messageId(), text: trimmed, channel, at: new Date().toISOString() },
          ],
          askedQuestionIds: question ? [...s.askedQuestionIds, question.id] : s.askedQuestionIds,
          messages: [
            ...s.messages,
            { id: messageId(), role: "user", kind: "text", text: trimmed, channel },
            {
              id: messageId(),
              role: "concierge",
              kind: "text",
              text: acknowledge(filled, guarantorTypeUnclear) + budgetNote,
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
      setComposingNewNeed(false);
    },
    [update],
  );

  const voice = useVoiceInput((text) => {
    setDraft([voicePrefix.current.trim(), text].filter(Boolean).join(" ").slice(0, 4000));
    setDraftChannel("voice");
  });

  const submitNeed = async () => {
    if (voice.listening || brainPending.current || !draft.trim()) return;
    if (!brainConsent || !brainAvailable) {
      applyText(draft, draftChannel);
      return;
    }
    const text = draft.trim();
    const channel = draftChannel;
    const history = state.messages
      .filter((message) => message.kind === "text")
      .slice(-9)
      .map((message) => ({
        role: message.role === "user" ? ("user" as const) : ("assistant" as const),
        text: message.kind === "text" ? message.text.slice(0, 4000) : "",
      }));
    brainPending.current = true;
    setBrainBusy(true);
    setBrainError("");
    try {
      const reply = await converseWithBrain({
        data: {
          consent: true,
          search: brainSearch,
          messages: [...history, { role: "user", text }],
        },
      });
      if (reply.status !== "ready") {
        setBrainError(reply.text);
        return;
      }
      const extracted = extractSlots(text).slots;
      update((previous) => ({
        ...previous,
        status: previous.status === "ANONYMOUS" ? "ENGAGED" : previous.status,
        slots: mergeSlots(previous.slots, extracted),
        intents: [
          ...previous.intents,
          { id: messageId(), text, channel, at: new Date().toISOString() },
        ],
        messages: [
          ...previous.messages,
          { id: messageId(), role: "user", kind: "text", text, channel },
          {
            id: messageId(),
            role: "concierge",
            kind: "text",
            text: reply.text,
            ai: {
              sources: reply.sources,
              researchedAt: reply.researchedAt,
              attributionRequired: reply.attributionRequired,
            },
          },
        ],
      }));
      setDraft("");
      setComposingNewNeed(false);
    } catch {
      setBrainError(
        "سرویس پاسخ نداد یا ظرفیت درخواست تکمیل شده است. متن حفظ شد؛ دوباره تلاش کن یا گزینهٔ مشاورهٔ AI را خاموش کن تا مسیر قبلی ادامه پیدا کند.",
      );
    } finally {
      brainPending.current = false;
      setBrainBusy(false);
    }
  };

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
        if (upcoming)
          track({ name: "question_asked", questionId: upcoming.id, slot: upcoming.slot });
        return {
          ...s,
          slots: merged,
          askedQuestionIds: upcoming ? [...s.askedQuestionIds, upcoming.id] : s.askedQuestionIds,
          messages: [
            ...s.messages,
            { id: messageId(), role: "user", kind: "text", text: label, channel: "typed" },
            ...(question.slot === "targetPrice" || question.slot === "spendingBudget"
              ? [
                  {
                    id: messageId(),
                    role: "concierge" as const,
                    kind: "text" as const,
                    text: budgetSummary(merged) || "بودجه ثبت شد؛ مبلغ هدف را جدا مشخص می‌کنیم.",
                  },
                ]
              : []),
            ...(upcoming
              ? ([
                  { id: messageId(), role: "concierge", kind: "question", questionId: upcoming.id },
                ] as const)
              : ([
                  {
                    id: messageId(),
                    role: "concierge",
                    kind: "text",
                    text: "پاسخ‌ها ثبت شد. حالا می‌توانی نتیجهٔ محاسبهٔ همین داده‌ها را بررسی کنی.",
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
      if (asked.length === 0 && s.intents.length === 0) return s;
      const lastMsg = s.messages[s.messages.length - 1];
      const viewingLast = lastMsg && lastMsg.role === "concierge" && lastMsg.kind === "question";
      const lastQ = QUESTIONS.find((q) => q.id === asked[asked.length - 1]);
      const lastAnswered = lastQ ? s.slots[lastQ.slot] !== undefined : false;
      const targetIdx = lastAnswered && !viewingLast ? asked.length - 1 : asked.length - 2;
      if (targetIdx < 0) {
        // Step back to the initial request stage (same history, no new state).
        const lastIntent = s.intents[s.intents.length - 1];
        if (!lastIntent) return s;
        const slots: IntentSlots = { ...s.slots };
        for (const id of asked) {
          const q = QUESTIONS.find((x) => x.id === id);
          if (q) delete slots[q.slot];
        }
        let at = -1;
        for (let i = s.messages.length - 1; i >= 0; i--) {
          const m = s.messages[i];
          if (m.role === "user" && m.kind === "text" && m.text === lastIntent.text) {
            at = i;
            break;
          }
        }
        return {
          ...s,
          slots,
          askedQuestionIds: [],
          intents: s.intents.slice(0, -1),
          messages: at >= 0 ? s.messages.slice(0, at) : [],
        };
      }
      const targetId = asked[targetIdx];
      const slots: IntentSlots = { ...s.slots };
      for (const id of asked.slice(targetIdx)) {
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
    if (state.askedQuestionIds.length === 0) {
      const lastIntent = state.intents[state.intents.length - 1];
      if (lastIntent) setDraft(lastIntent.text);
    }
  }, [update, state.askedQuestionIds, state.intents]);

  const reAsk = React.useCallback(
    (key: SlotKey) => {
      const question = QUESTIONS.find((q) => q.slot === key);
      if (!question) return;
      update((s) => {
        const slots = { ...s.slots };
        delete slots[key];
        return {
          ...s,
          slots,
          messages: [
            ...s.messages,
            { id: messageId(), role: "concierge", kind: "question", questionId: question.id },
          ],
        };
      });
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
    if (asked.length === 0) return state.intents.length > 0;
    const lastMsg = state.messages[state.messages.length - 1];
    const viewingLast = Boolean(
      lastMsg && lastMsg.role === "concierge" && lastMsg.kind === "question",
    );
    const lastQ = QUESTIONS.find((q) => q.id === asked[asked.length - 1]);
    const lastAnswered = lastQ ? state.slots[lastQ.slot] !== undefined : false;
    const idx = lastAnswered && !viewingLast ? asked.length - 1 : asked.length - 2;
    return idx >= 0 || state.intents.length > 0;
  }, [state.askedQuestionIds, state.slots, state.messages, state.intents]);

  const lastQuestion = React.useMemo(() => {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      const m = state.messages[i];
      if (m.role === "concierge" && m.kind === "question")
        return { id: m.id, questionId: m.questionId };
    }
    return null;
  }, [state.messages]);
  const lastQuestionId = lastQuestion?.questionId ?? null;

  if (!hydrated) {
    return <div className="h-[60vh] animate-pulse rounded-3xl border border-border bg-surface" />;
  }

  return (
    <div className="space-y-5">
      {started ? (
        <div className="space-y-3">
          {state.messages.map((message) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-start">
                  <div className="anim-resolve max-w-[85%] rounded-3xl rounded-ss-md bg-signal/15 px-4 py-2.5 text-sm text-foreground">
                    {toDisplayDigits(message.text)}
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
                    {message.ai ? (
                      <p className="mb-2 text-xs text-accent">
                        پاسخ هوش مصنوعی · نه تأیید مالی یا رتبهٔ اعتباری
                      </p>
                    ) : null}
                    <span className="whitespace-pre-wrap">{toDisplayDigits(message.text)}</span>
                    {message.ai?.sources.length && message.ai.attributionRequired !== false ? (
                      <div className="mt-3 flex flex-wrap gap-3" aria-label="منابع پاسخ">
                        {message.ai.sources.map((item, index) => {
                          const source = safeSource(item.title, item.url);
                          return source ? (
                            <a
                              key={source.url}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent underline"
                            >
                              [{index + 1}] {source.title}
                            </a>
                          ) : null;
                        })}
                        <p className="w-full text-[10px] text-muted-foreground">
                          منابع عمومی وب؛ نه تأیید همکاری، موجودی یا شرایط قطعی. زمان بررسی:{" "}
                          {message.ai.researchedAt
                            ? new Date(message.ai.researchedAt).toISOString().slice(0, 10)
                            : "نامشخص"}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            }
            if (message.kind === "question") {
              if (brainConsent && brainAvailable) return null;
              if (message.id !== lastQuestion?.id) return null;
              const question = QUESTIONS.find((q) => q.id === message.questionId);
              if (!question) return null;
              const answered = state.slots[question.slot] !== undefined;
              const index = state.askedQuestionIds.indexOf(question.id) + 1;
              if (answered && (complete || message.questionId !== lastQuestionId)) return null;
              return (
                <QuestionCard
                  key={message.id}
                  question={question}
                  index={index > 0 ? index : 1}
                  selected={state.slots[question.slot]?.value as string | number | undefined}
                  onBack={canGoBack && message.questionId === lastQuestionId ? goBack : undefined}
                  onAnswer={(value, label) => answer(question.id, value, label)}
                />
              );
            }
            return null;
          })}
          <div ref={endRef} />
        </div>
      ) : null}

      {canGoBack && (complete || lastQuestionId === null) ? (
        <button
          type="button"
          onClick={goBack}
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-accent/60 hover:text-foreground"
        >
          مرحله قبل
        </button>
      ) : null}

      <SlotChips slots={state.slots} onEdit={reAsk} />

      {complete && !composingNewNeed ? (
        <button
          type="button"
          className="min-h-11 text-sm text-accent underline underline-offset-4"
          onClick={() => setComposingNewNeed(true)}
        >
          شرح نیاز جدید با حفظ اطلاعات پرونده
        </button>
      ) : null}
      {!complete || composingNewNeed || brainAvailable ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitNeed();
          }}
          className={cn(started ? "relative" : "home-need-form")}
        >
          {suggestedNeed && !draft.trim() && !voice.listening ? (
            <button
              type="button"
              className="mb-3 text-sm text-accent underline underline-offset-4"
              onClick={() => setDraft(suggestedNeed)}
            >
              {suggestionLabel}
            </button>
          ) : null}
          <div
            className={cn(
              "flex items-center gap-2 border border-border bg-surface/95 p-2 backdrop-blur-xl",
              started ? "rounded-3xl" : "home-need-control",
            )}
          >
            <button
              type="button"
              onClick={() => {
                if (voice.listening) voice.stop();
                else {
                  voicePrefix.current = draft;
                  voice.start();
                }
              }}
              disabled={!voice.supported || brainBusy}
              aria-label={
                voice.supported
                  ? voice.listening
                    ? "پایان ضبط"
                    : "گفتن نیاز با صدا"
                  : "ورودی صوتی در این مرورگر پشتیبانی نمی‌شود"
              }
              title={voice.supported ? undefined : "ورودی صوتی در این مرورگر پشتیبانی نمی‌شود"}
              className={cn(
                "home-need-control__action home-need-control__voice",
                voice.listening && "is-listening",
              )}
            >
              <MicIcon />
            </button>
            <input
              type="text"
              maxLength={4000}
              value={voice.listening ? [draft, voice.interim].filter(Boolean).join(" ") : draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDraftChannel("typed");
              }}
              readOnly={voice.listening || brainBusy}
              placeholder={
                voice.listening
                  ? "در حال شنیدن…"
                  : "هدفت چیه؟ مثلاً وام نقدی، خودرو اقساط یا خرید کالا"
              }
              className="home-need-control__input"
              aria-label="خواسته‌ات را بنویس"
            />
            <button
              type="submit"
              disabled={voice.listening || brainBusy || !draft.trim()}
              aria-label="شروع جست‌وجوی مسیر"
              className="home-need-control__action home-need-control__submit"
            >
              <SearchIcon />
            </button>
          </div>
          {brainAvailable ? (
            <div className="mt-2 space-y-2 px-2 text-xs text-muted-foreground">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={brainConsent}
                  disabled={brainBusy}
                  onChange={(event) => {
                    setBrainConsent(event.target.checked);
                    setBrainError("");
                  }}
                />
                <span>
                  مشاورهٔ AI: با ارسال متن و بخش اخیر همین گفتگو به OpenAI موافقم. فقط شرایط کلی و
                  نوع مدارک؛ بدون نام، آدرس، شماره هویتی، رمز یا فایل مدرک. خاموش باشد، بررسی قبلی
                  ادامه دارد.
                </span>
              </label>
              {brainConsent ? (
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={brainSearch}
                    disabled={brainBusy}
                    onChange={(event) => setBrainSearch(event.target.checked)}
                  />
                  <span>
                    جست‌وجوی منابع روز با موضوع عمومی خدمت، بدون ارسال اطلاعات شخصی به جست‌وجو.
                  </span>
                </label>
              ) : null}
            </div>
          ) : null}
          {brainBusy ? (
            <p role="status" className="mt-2 px-2 text-xs text-accent">
              {brainSearch
                ? "در حال بررسی منابع عمومی و آماده‌سازی پاسخ…"
                : "در حال آماده‌سازی پاسخ…"}
            </p>
          ) : null}
          {brainError ? (
            <p role="alert" className="mt-2 px-2 text-xs text-destructive">
              {brainError}
            </p>
          ) : null}
          <p className={cn("px-2 text-[10px] text-muted-foreground", started ? "mt-1" : "sr-only")}>
            پس از پایان ضبط، متن را بررسی و با دکمهٔ جست‌وجو ارسال کن. تسهیل‌رادار فایل صوتی ذخیره
            نمی‌کند؛ تشخیص گفتار تابع سرویس مرورگر توست.
          </p>
        </form>
      ) : null}
      {composingNewNeed ? (
        <button
          type="button"
          className="min-h-11 text-sm text-muted-foreground"
          onClick={() => {
            setComposingNewNeed(false);
            setDraft("");
          }}
        >
          انصراف از نیاز جدید
        </button>
      ) : null}

      {analyzing ? (
        <p className="anim-resolve rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm text-muted-foreground">
          در حال تحلیل توان بازپرداخت، اعتبار و فرصت‌های مناسب…
        </p>
      ) : null}

      {complete && !analyzing ? (
        <section className="space-y-3">
          <ReasoningNotice />
          <AuthorityBadge computedBy={confirmed ? "server-authoritative" : trace.computedBy} />
          <RadarTally trace={trace} />
          <div className="flex gap-2">
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}
