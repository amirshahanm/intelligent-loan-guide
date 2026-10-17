import { fromToman, toLatinDigits } from "@/lib/money";

/** UI validation only: never infer credit limits or remove signs/letters. */
export function parseMillionTomanInput(input: string): number | null {
  const text = toLatinDigits(input).trim().replace(/٫/g, ".");
  if (!/^\d+(?:\.\d{1,7})?$/.test(text)) return null;
  const toman = Number(text) * 1_000_000;
  const irr = fromToman(toman);
  return Number.isSafeInteger(irr) && irr > 0 ? irr : null;
}
