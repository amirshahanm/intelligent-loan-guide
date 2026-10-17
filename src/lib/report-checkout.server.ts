import { reservePostgresReportRequest, attachPostgresReportAuthority } from "./postgres.server";
import { createZarinpalReportAdapter } from "./providers/zarinpal-report.server";

type Owner = { reportId: string; sessionId: string; sessionCapability: string };
// Dependency injection is server-only, for isolated testing; never a client input.
export async function requestOwnedReportPayment(input: Owner, transport?: typeof fetch) {
  if (process.env.TASHILRADAR_REPORT_PAYMENTS !== "true" || !process.env.ZARINPAL_MERCHANT_ID)
    throw new Error("report_payments_unavailable");
  const token = await reservePostgresReportRequest(input);
  const adapter = createZarinpalReportAdapter({
    merchantId: process.env.ZARINPAL_MERCHANT_ID,
    callbackUrl: "https://tashilradar.com/payment/callback",
    transport,
  });
  let result: Awaited<ReturnType<typeof adapter.request>>;
  try {
    result = await adapter.request();
  } catch {
    await attachPostgresReportAuthority({ reportId: input.reportId, token, authority: null });
    throw new Error("report_payment_request_uncertain");
  }
  // Never redirect until authority binding is durably committed.
  await attachPostgresReportAuthority({
    reportId: input.reportId,
    token,
    authority: result.authority,
  });
  return result;
}
