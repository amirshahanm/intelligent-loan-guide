/**
 * Public support channels. A channel is shown only when its value is filled
 * with a verified, owner-provided contact. Empty values stay hidden so the
 * product never displays an unverified number.
 */
export const SUPPORT_CHANNELS: {
  phone: string;
  whatsapp: string;
  telegram: string;
  bale: string;
  hours: string;
} = {
  /** Full number with country code, digits only, e.g. "989121234567". */
  phone: "",
  whatsapp: "",
  /** Telegram username without @. */
  telegram: "",
  /** Bale username without @. */
  bale: "",
  /** Persian working hours text, e.g. «شنبه تا پنجشنبه، ۹ تا ۱۸». */
  hours: "",
};

export function hasSupportChannel(): boolean {
  const { phone, whatsapp, telegram, bale } = SUPPORT_CHANNELS;
  return Boolean(phone || whatsapp || telegram || bale);
}
