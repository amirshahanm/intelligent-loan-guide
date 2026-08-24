import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ProvenanceChip, SectionTitle } from "@/components/provenance";
import { providers } from "@/lib/providers";
import type { CreditResult } from "@/lib/providers";
import { useSession } from "@/lib/session";
import { track } from "@/lib/analytics";
import { providerVerified } from "@/core/types";
import { faNumber, formatToman, formatTomanCompact, toPersianDigits } from "@/lib/money";
import { cn } from "@/lib/utils";

type Stage = "intro" | "consent" | "payment" | "analyzing" | "revealed";

const BAND_FA: Record<CreditResult["band"], { label: string; tone: string; note: string }> = {
  strong: {
    label: "سیگنال اعتباری قوی",
    tone: "text-accent",
    note: "الگوی بازپرداخت منظم و ظرفیت باز قابل توجه.",
  },
  moderate: {
    label: "سیگنال اعتباری متوسط",
    tone: "text-signal",
    note: "پرونده قابل قبول است، اما جای تقویت دارد.",
  },
  thin: {
    label: "سابقهٔ اعتباری کم‌عمق",
    tone: "text-warn",
    note: "سابقهٔ کافی برای قضاوت دقیق ثبت نشده است.",
  },
  impaired: {
    label: "سیگنال اعتباری آسیب‌دیده",
    tone: "text-danger",
    note: "نشانه‌هایی از تأخیر در بازپرداخت دیده می‌شود.",
  },
};

const ANALYSIS_PHASES = [
  { key: "scan", label: "خواندن ساختار پرونده" },
  { key: "detect", label: "تشخیص الگوی بازپرداخت" },
  { key: "connect", label: "اتصال به ظرفیت مسیرهای فعال" },
  { key: "resolve", label: "جمع‌بندی و توضیح" },
] as const;

export function CreditJourney() {
  const { state, update, hydrated } = useSession();
  const [stage, setStage] = React.useState<Stage>("intro");
  const [consent, setConsent] = React.useState(false);
  const [phase, setPhase] = React.useState(0);
  const [reveal, setReveal] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const productionUnavailable = import.meta.env.VITE_TASHILRADAR_DEPLOYMENT_MODE === "production";
  const price = productionUnavailable ? 0 : providers.credit.priceIrr();

  const result = state.creditResult;

  React.useEffect(() => {
    if (hydrated && result && stage === "intro") {
      setStage("revealed");
      setReveal(4);
    }
  }, [hydrated, result, stage]);

  const runAnalysis = React.useCallback(async () => {
    if (productionUnavailable) {
      setError("اعتبارسنجی واقعی هنوز به سرویس معتبر متصل نشده است.");
      setStage("intro");
      return;
    }
    setError(null);
    setStage("analyzing");
    setPhase(0);
    track({ name: "credit_started", simulated: true });
    const ticker = window.setInterval(() => setPhase((p) => Math.min(p + 1, 3)), 380);
    try {
      const intent = await providers.payment.createIntent(price);
      await providers.payment.confirm(intent.id);
      const res = await providers.credit.check({
        anonSessionId: state.anonSessionId,
        consentGiven: true,
      });
      window.clearInterval(ticker);
      setPhase(3);
      update((s) => ({ ...s, creditResult: res }));
      setStage("revealed");
      setReveal(0);
    } catch {
      window.clearInterval(ticker);
      setError("اعتبارسنجی کامل نشد. دوباره تلاش کن.");
      setStage("consent");
    }
  }, [price, productionUnavailable, state.anonSessionId, update]);

  React.useEffect(() => {
    if (stage !== "revealed" || reveal >= 4) return;
    const t = window.setTimeout(() => setReveal((r) => r + 1), 620);
    return () => window.clearTimeout(t);
  }, [stage, reveal]);

  if (!hydrated) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">اعتبارسنجی</h1>
      </div>

      {stage === "intro" ? (
        <IntroPanel
          available={!productionUnavailable}
          priceLabel={productionUnavailable ? "پس از اتصال سرویس" : formatToman(price)}
          error={error}
          onStart={() => setStage("consent")}
        />
      ) : null}

      {stage === "consent" ? (
        <section className="rounded-3xl border border-border bg-surface p-4">
          <SectionTitle hint="پیش از هر بررسی">رضایت آگاهانه</SectionTitle>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>· بررسی اعتباری تنها با اجازهٔ صریح تو انجام می‌شود.</li>
            <li>· داده‌های خام اعتباری هرگز به مرورگر ارسال نمی‌شود و سمت سرور می‌ماند.</li>
            <li>· رضایت با نسخهٔ سیاست و زمان ثبت، به همان پرونده متصل می‌شود.</li>
          </ul>
          <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-2xl border border-border bg-elevated/50 p-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
            />
            <span className="text-xs leading-5">اجازهٔ اجرای اعتبارسنجی را می‌دهم.</span>
          </label>
          {error ? <p className="mt-2 text-[11px] text-danger">{error}</p> : null}
          <button
            type="button"
            disabled={!consent}
            onClick={() => setStage("payment")}
            className="mt-4 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-40"
          >
            ادامه
          </button>
        </section>
      ) : null}

      {stage === "payment" ? (
        <section className="rounded-3xl border border-border bg-surface p-4">
          <SectionTitle>پرداخت هزینهٔ بررسی</SectionTitle>
          <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-center">
            <div className="text-[10px] text-muted-foreground">هزینهٔ بررسی</div>
            <div className="num mt-1 text-2xl font-extrabold text-gold">{formatToman(price)}</div>
          </div>
          <button
            type="button"
            onClick={runAnalysis}
            className="mt-4 w-full rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-gold-foreground"
          >
            پرداخت و شروع بررسی
          </button>
          <button
            type="button"
            onClick={() => setStage("consent")}
            className="mt-2 w-full rounded-2xl border border-border px-4 py-2.5 text-xs text-muted-foreground"
          >
            بازگشت
          </button>
        </section>
      ) : null}

      {stage === "analyzing" ? (
        <section className="surface-panel rounded-3xl p-5">
          <div className="text-sm font-semibold">در حال بررسی پرونده</div>
          <ul className="mt-4 space-y-3">
            {ANALYSIS_PHASES.map((p, i) => (
              <li key={p.key} className="flex items-center gap-3">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    i < phase
                      ? "bg-accent"
                      : i === phase
                        ? "bg-accent anim-pulse-node"
                        : "bg-border",
                  )}
                />
                <span
                  className={cn(
                    "text-xs",
                    i <= phase ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {p.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${((phase + 1) / 4) * 100}%` }}
            />
          </div>
        </section>
      ) : null}

      {stage === "revealed" && result ? (
        <CreditReveal
          result={result}
          step={reveal}
          onReset={() => {
            update((s) => ({ ...s, creditResult: undefined }));
            setStage("intro");
            setConsent(false);
            setReveal(0);
          }}
        />
      ) : null}
    </div>
  );
}

function IntroPanel({
  priceLabel,
  available,
  error,
  onStart,
}: {
  priceLabel: string;
  available: boolean;
  error: string | null;
  onStart: () => void;
}) {
  return (
    <section className="surface-panel rounded-3xl p-5">
      <h2 className="text-base font-bold">پرونده‌ات از نگاه یک وام‌دهنده</h2>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        اعتبارسنجی در تسهیل‌رادار یک عدد خشک نیست. سیگنال اعتباری به ظرفیت مسیرهای واقعی وصل می‌شود
        و با زبان ساده توضیح می‌دهیم چه چیزی مسیر را باز یا بسته نگه داشته است.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="هزینهٔ بررسی" value={priceLabel} />
        <MiniStat label="وضعیت سرویس" value={available ? "نسخهٔ آزمایشی" : "در حال اتصال"} />
      </div>
      {available ? (
        <button
          type="button"
          onClick={onStart}
          className="mt-4 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground"
        >
          شروع اعتبارسنجی آزمایشی
        </button>
      ) : (
        <div className="mt-4 rounded-2xl border border-signal/30 bg-signal/10 p-3 text-xs leading-5 text-muted-foreground">
          اعتبارسنجی واقعی تا اتصال سرویس معتبر غیرفعال است. تسهیل‌رادار نتیجهٔ ساختگی را جای دادهٔ
          واقعی نمایش نمی‌دهد.
        </div>
      )}
      {error ? <p className="mt-2 text-[11px] text-warn">{error}</p> : null}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated/50 p-3 text-center">
      <div className="num text-sm font-bold">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function CreditReveal({
  result,
  step,
  onReset,
}: {
  result: CreditResult;
  step: number;
  onReset: () => void;
}) {
  const band = BAND_FA[result.band];
  return (
    <div className="space-y-4">
      <section
        className={cn(
          "surface-panel rounded-3xl p-5 text-center transition-all duration-500",
          step >= 0 ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="text-[10px] text-muted-foreground">سیگنال اعتباری</div>
        <div className={cn("num mt-1 text-5xl font-extrabold", band.tone)}>
          {toPersianDigits(result.signal)}
        </div>
        <div className={cn("mt-1 text-sm font-bold", band.tone)}>{band.label}</div>
        <p className="mt-2 text-xs text-muted-foreground">{band.note}</p>
        <div className="mt-3 flex justify-center">
          <ProvenanceChip
            provenance={{ ...providerVerified(0.9, result.demo), asOf: result.asOf }}
          />
        </div>
      </section>

      {step >= 1 ? (
        <section className="anim-detect rounded-3xl border border-gold/40 bg-gold/10 p-4 text-center">
          <div className="text-[10px] text-muted-foreground">ظرفیت اعتباری تخمینی</div>
          <div className="num mt-1 text-3xl font-extrabold text-gold">
            {formatTomanCompact(result.estimatedCapacity)}
          </div>
          <div className="num mt-1 text-[11px] text-muted-foreground">
            {formatToman(result.estimatedCapacity)}
          </div>
        </section>
      ) : null}

      {step >= 2 ? (
        <section className="anim-connect rounded-3xl border border-border bg-surface p-4">
          <SectionTitle>اجزای پرونده</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="تسهیلات باز" value={faNumber(result.openFacilities)} />
            <MiniStat label="رویداد تأخیر" value={faNumber(result.latePaymentEvents)} />
          </div>
          <ul className="mt-3 space-y-1.5">
            {result.notes.map((n) => (
              <li key={n} className="flex gap-2 text-[11px] leading-5 text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" />
                {n}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step >= 3 ? (
        <section className="anim-resolve rounded-3xl border border-border bg-surface p-4">
          <SectionTitle>قدم بعدی</SectionTitle>
          <div className="space-y-2">
            <Link
              to="/opportunities"
              className="block rounded-2xl bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-foreground"
            >
              دیدن فرصت‌ها با این سیگنال
            </Link>
            <Link
              to="/radar"
              className="block rounded-2xl border border-border px-4 py-3 text-center text-sm text-foreground"
            >
              دیدن اثر آن روی رادار
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-2xl px-4 py-2 text-center text-[11px] text-muted-foreground"
            >
              اجرای دوبارهٔ بررسی
            </button>
          </div>
          <p className="num mt-3 text-[10px] text-muted-foreground">
            شمارهٔ پیگیری: {result.requestId}
          </p>
        </section>
      ) : null}
    </div>
  );
}
