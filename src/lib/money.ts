/**
 * Money + Persian presentation layer.
 *
 * Canonical storage is ALWAYS integer IRR (Rials).
 * Conversion to Toman and Persian numeral formatting happens ONLY here,
 * at the presentation boundary. Formatted strings are never persisted.
 */

import type { IRR } from "@/core/types";

export const IRR_PER_TOMAN = 10;

export const toToman = (irr: IRR): number => Math.round(irr / IRR_PER_TOMAN);
export const fromToman = (toman: number): IRR => Math.round(toman * IRR_PER_TOMAN);
export const millionToman = (m: number): IRR => fromToman(m * 1_000_000);

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Convert ASCII digits in a string to Persian digits. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Convert Persian/Arabic-Indic digits in user input back to ASCII. */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function groupThousands(n: number): string {
  return Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
}

/** Persian-numeral integer, thousand-separated. */
export function faNumber(n: number): string {
  return toPersianDigits(groupThousands(Math.round(n)));
}

/** Full Toman amount, e.g. «۳۰۰٬۰۰۰٬۰۰۰ تومان». */
export function formatToman(irr: IRR): string {
  return `${faNumber(toToman(irr))} تومان`;
}

/** Compact Toman, e.g. «۳۰۰ میلیون تومان» / «۱٫۲ میلیارد تومان». */
export function formatTomanCompact(irr: IRR): string {
  const t = toToman(irr);
  if (t >= 1_000_000_000) {
    const v = t / 1_000_000_000;
    return `${toPersianDigits(trimDecimal(v))} میلیارد تومان`;
  }
  if (t >= 1_000_000) {
    const v = t / 1_000_000;
    return `${toPersianDigits(trimDecimal(v))} میلیون تومان`;
  }
  if (t >= 1_000) return `${toPersianDigits(trimDecimal(t / 1_000))} هزار تومان`;
  return `${faNumber(t)} تومان`;
}

function trimDecimal(v: number): string {
  const s = v >= 100 ? v.toFixed(0) : v.toFixed(1);
  return s.replace(/\.0$/, "").replace(".", "٫");
}

export function faPercent(n: number): string {
  return `${toPersianDigits(Math.round(n))}٪`;
}

/** Persian relative freshness, e.g. «۱۲ دقیقه پیش». */
export function faRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return "همین الان";
  if (mins < 60) return `${toPersianDigits(mins)} دقیقه پیش`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${toPersianDigits(days)} روز پیش`;
  return `${toPersianDigits(Math.round(days / 30))} ماه پیش`;
}

export function faDays(days: number): string {
  return `${toPersianDigits(days)} روز`;
}

export function faMonths(months: number): string {
  return `${toPersianDigits(months)} ماه`;
}
