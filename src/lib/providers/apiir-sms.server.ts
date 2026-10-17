import type { SmsProvider } from "./types";

/** Server-only adapter. No retries: a timed-out request may already be billed. */
export function createApiirSmsProvider(
  token: string,
  transport: typeof fetch = fetch,
): SmsProvider {
  if (!token.trim() || /[\r\n]/.test(token)) throw new Error("apiir_not_configured");
  return {
    id: "apiir_sms",
    isMock: false,
    async sendOtp(phone, code) {
      const mobile = /^\+989\d{9}$/.test(phone) ? `0${phone.slice(3)}` : phone;
      if (!/^09\d{9}$/.test(mobile) || !/^\d{6}$/.test(code)) {
        throw new Error("apiir_invalid_otp_input");
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await transport("https://s.api.ir/api/sw1/SmsOTP", {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({ mobile, code, template: 1 }),
          signal: controller.signal,
          redirect: "error",
        });
        if (!response.ok) throw new Error("apiir_delivery_failed");
        const result: unknown = await response.json();
        if (
          !result ||
          typeof result !== "object" ||
          !("success" in result) ||
          result.success !== true ||
          !("data" in result) ||
          result.data !== true
        )
          throw new Error("apiir_delivery_failed");
        // Application-owned challenge lifetime; not a provider validity claim.
        return { sent: true, expiresInSeconds: 120 };
      } catch {
        // Never surface vendor text, phone, code, token or raw network errors.
        throw new Error("apiir_delivery_failed");
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export function configuredApiirSmsProvider(
  env: Record<string, string | undefined>,
): SmsProvider | null {
  if (env.TASHILRADAR_APIIR_SMS_ENABLED !== "true") return null;
  const token = env.TASHILRADAR_APIIR_TOKEN;
  return token ? createApiirSmsProvider(token) : null;
}
