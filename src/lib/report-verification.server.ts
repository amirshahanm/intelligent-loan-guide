import {
  claimPostgresReportVerification,
  settlePostgresReportVerification,
} from "./postgres.server";
import { createZarinpalReportAdapter } from "./providers/zarinpal-report.server";

// Disabled until an approved checkout release. No externally callable handler.
export async function verifyOwnedReportPayment(
  input: {
    reportId: string;
    sessionId: string;
    sessionCapability: string;
    authority: string;
  },
  transport?: typeof fetch,
) {
  if (process.env.TASHILRADAR_REPORT_PAYMENTS !== "true" || !process.env.ZARINPAL_MERCHANT_ID)
    throw new Error("report_payments_unavailable");
  const token = await claimPostgresReportVerification(input);
  const adapter = createZarinpalReportAdapter({
    merchantId: process.env.ZARINPAL_MERCHANT_ID,
    callbackUrl: "https://tashilradar.com/payment/callback",
    transport,
  });
  let result: Awaited<ReturnType<typeof adapter.verify>>;
  try {
    result = await adapter.verify(input.authority);
  } catch {
    return settlePostgresReportVerification({
      reportId: input.reportId,
      token,
      result: { status: "uncertain" },
    });
  }
  return settlePostgresReportVerification({
    reportId: input.reportId,
    token,
    result: result.status === "verified" ? result : { status: "uncertain" },
  });
}
