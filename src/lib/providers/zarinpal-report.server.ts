import { REPORT_OFFER } from "../report-policy";

// Internal transport only. Callers must persist an owned order and reserve each
// attempt before invoking this adapter; it never unlocks a report itself.
export function createZarinpalReportAdapter(options: {
  merchantId?: string;
  callbackUrl: string;
  transport?: typeof fetch;
}) {
  const transport = options.transport ?? fetch;
  async function post(operation: "request" | "verify", fields: Record<string, unknown>) {
    if (!options.merchantId) throw new Error("payment_not_configured");
    try {
      const response = await transport(`https://api.zarinpal.com/pg/v4/payment/${operation}.json`, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          merchant_id: options.merchantId,
          amount: REPORT_OFFER.amountIrr,
          ...fields,
        }),
      });
      if (!response.ok) throw new Error("upstream");
      return (await response.json()) as {
        data?: { code?: number; authority?: string; ref_id?: unknown };
      };
    } catch {
      // A timeout may follow a successful upstream operation. Never auto-retry.
      throw new Error("payment_uncertain");
    }
  }
  return {
    async request() {
      const callback = new URL(options.callbackUrl);
      if (
        callback.origin !== "https://tashilradar.com" ||
        callback.username ||
        callback.password ||
        callback.hash
      )
        throw new Error("invalid_payment_callback");
      const result = await post("request", {
        callback_url: callback.href,
        description: REPORT_OFFER.title,
      });
      const authority = result.data?.authority;
      if (result.data?.code !== 100 || !authority || !/^[A-Za-z0-9]{16,64}$/.test(authority))
        throw new Error("payment_request_rejected");
      return { authority, redirectUrl: `https://www.zarinpal.com/pg/StartPay/${authority}` };
    },
    async verify(persistedAuthority: string) {
      if (!/^[A-Za-z0-9]{16,64}$/.test(persistedAuthority))
        throw new Error("invalid_payment_authority");
      const result = await post("verify", { authority: persistedAuthority });
      const reference = result.data?.ref_id;
      if (result.data?.code === 101) return { status: "reconcile" as const };
      if (result.data?.code !== 100) return { status: "not_verified" as const };
      if (
        !(typeof reference === "string" && /^\d{1,32}$/.test(reference)) &&
        !(typeof reference === "number" && Number.isSafeInteger(reference) && reference > 0)
      )
        throw new Error("payment_uncertain");
      return { status: "verified" as const, reference: String(reference) };
    },
  };
}
