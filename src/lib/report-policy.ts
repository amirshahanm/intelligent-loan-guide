// Founder-approved price. All financial amounts below are integer Rial.
export const REPORT_OFFER = {
  id: "personal-action-plan-v1",
  title: "گزارش شخصی‌سازی‌شده و برنامه اقدام",
  priceToman: 110_000,
  amountIrr: 1_100_000,
  includes: [
    "جمع‌بندی شرایط شما",
    "مقایسه مسیرهای قابل بررسی",
    "هزینه‌ها و ابهام‌های مهم",
    "مدارک و برنامه اقدام",
  ],
  excludes: ["تضمین وام یا خرید", "رتبه اعتباری رسمی", "تأیید بانک یا فروشنده"],
} as const;
export type ReportStatus =
  | "prepared"
  | "payment_pending"
  | "paid"
  | "delivered"
  | "payment_uncertain";
export function canDeliverReport(status: ReportStatus): boolean {
  return status === "paid" || status === "delivered";
}
export function validatePreparedReport(text: string): boolean {
  return text.trim().length >= 400 && text.length <= 24000;
}
