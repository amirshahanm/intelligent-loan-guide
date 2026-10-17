import { useAuthoritativeTrace } from "@/hooks/use-authoritative-trace";
import { anyMock } from "@/lib/providers";

export function ReasoningNotice() {
  const { confirmationFailed, persistenceDisabled, retryConfirmation, confirming } =
    useAuthoritativeTrace();
  return (
    <div className="space-y-2 text-xs leading-6">
      {anyMock ? (
        <p className="rounded-2xl border border-warn/30 bg-warn/5 p-3 text-warn">
          کاتالوگ آزمایشی — نام مؤسسه‌ها، شرایط و تطابق‌ها نمونه‌اند؛ پیشنهاد واقعی یا تأیید بانک
          نیستند. تأیید موتور سرور فقط به محاسبه اشاره دارد.
        </p>
      ) : null}
      {persistenceDisabled ? (
        <p className="rounded-2xl border border-border bg-surface p-3 text-muted-foreground">
          ذخیرهٔ امن سمت سرور در این محیط متصل نیست؛ پرونده فعلاً فقط روی همین مرورگر باقی می‌ماند.
        </p>
      ) : null}
      {confirmationFailed ? (
        <div role="alert" className="rounded-2xl border border-warn/30 bg-surface p-3">
          <p>
            تأیید سرور کامل نشد. نتیجهٔ فعلی فقط پیش‌نمایش محلی است؛ ذخیرهٔ امن یا ثبت درخواست تأیید
            نشده است.
          </p>
          <button
            type="button"
            onClick={retryConfirmation}
            disabled={confirming}
            className="mt-2 min-h-11 text-accent disabled:opacity-50"
          >
            {confirming ? "در حال تلاش مجدد…" : "تلاش دوباره برای تأیید"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
