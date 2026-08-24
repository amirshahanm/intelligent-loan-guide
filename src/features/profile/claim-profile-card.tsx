import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { requestOtp, verifyOtp } from "@/lib/otp.functions";
import { useSession } from "@/lib/session";

export function ClaimProfileCard() {
  const { state, update } = useSession();
  const sendOtp = useServerFn(requestOtp);
  const confirmOtp = useServerFn(verifyOtp);
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [challengeId, setChallengeId] = React.useState<string | null>(null);
  const [demoCode, setDemoCode] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (state.status === "CLAIMED") {
    return (
      <section className="rounded-3xl border border-accent/35 bg-accent/10 p-4">
        <div className="text-sm font-bold text-accent">پرونده به حساب تو متصل است</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          این پرونده دیگر فقط به مرورگر وابسته نیست و مالکیت آن سمت سرور ثبت شده است.
        </p>
      </section>
    );
  }

  const continuity = state.backend;
  const canClaim = Boolean(
    continuity?.sessionId && continuity.caseId && continuity.sessionCapability,
  );

  async function handleSend() {
    if (!canClaim) {
      setError("اول پرونده را تا مرحلهٔ تصمیم ادامه بده تا نشست امن ساخته شود.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await sendOtp({ data: { phone } });
      setChallengeId(result.challengeId);
      setDemoCode(result.demoCode ?? null);
    } catch {
      setError("ارسال کد انجام نشد. اگر سرویس پیامک واقعی هنوز متصل نیست، این بخش موقتاً غیرفعال می‌ماند.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!challengeId || !continuity?.sessionId || !continuity.caseId || !continuity.sessionCapability) {
      setError("اطلاعات نشست برای اتصال پرونده کامل نیست.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await confirmOtp({
        data: {
          phone,
          challengeId,
          code,
          claim: {
            sessionId: continuity.sessionId,
            caseId: continuity.caseId,
            sessionCapability: continuity.sessionCapability,
          },
        },
      });
      if (!result.verified || !result.claimed) {
        setError("کد معتبر نبود یا پرونده متصل نشد.");
        return;
      }
      update((current) => ({
        ...current,
        status: "CLAIMED",
        backend: current.backend
          ? {
              sessionId: current.backend.sessionId,
              caseId: current.backend.caseId,
              decisionRunId: current.backend.decisionRunId,
            }
          : undefined,
      }));
      setCode("");
      setDemoCode(null);
    } catch {
      setError("تأیید موبایل یا اتصال پرونده کامل نشد. دوباره تلاش کن.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface-panel rounded-3xl p-4">
      <div className="text-[10px] font-medium text-accent">ذخیرهٔ امن پرونده</div>
      <h2 className="mt-1 text-base font-bold">پرونده‌ات را به شمارهٔ موبایل خودت وصل کن</h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        ورود برای شروع لازم نیست. فقط وقتی می‌خواهی پرونده روی دستگاه‌های بعدی هم متعلق به خودت بماند،
        شماره را تأیید می‌کنی.
      </p>

      <div className="mt-4 space-y-2">
        <input
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="مثلاً 09123456789"
          disabled={Boolean(challengeId) || busy}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />

        {!challengeId ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={busy || phone.trim().length < 10 || !canClaim}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-40"
          >
            {busy ? "در حال ارسال…" : "ارسال کد تأیید"}
          </button>
        ) : (
          <>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="کد ۶ رقمی"
              disabled={busy}
              className="num w-full rounded-2xl border border-border bg-background px-4 py-3 text-center text-lg tracking-[0.35em] outline-none transition-colors focus:border-accent"
            />
            {demoCode ? (
              <div className="rounded-2xl border border-warn/30 bg-warn/10 px-3 py-2 text-[11px] text-warn">
                کد محیط آزمایشی: <span className="num font-bold">{demoCode}</span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleVerify}
              disabled={busy || code.length !== 6}
              className="w-full rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-gold-foreground disabled:opacity-40"
            >
              {busy ? "در حال تأیید…" : "تأیید و اتصال پرونده"}
            </button>
            <button
              type="button"
              onClick={() => {
                setChallengeId(null);
                setCode("");
                setDemoCode(null);
                setError(null);
              }}
              disabled={busy}
              className="w-full rounded-2xl border border-border px-4 py-2.5 text-xs text-muted-foreground"
            >
              اصلاح شماره
            </button>
          </>
        )}
      </div>

      {!canClaim ? (
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          بعد از اینکه موتور یک Case امن برای پرونده ساخت، امکان اتصال موبایل فعال می‌شود.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-[11px] leading-5 text-danger">{error}</p> : null}
    </section>
  );
}
