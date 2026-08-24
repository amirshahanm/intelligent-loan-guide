import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const creditExecutionSchema = z.object({
  anonSessionId: z.string().min(6).max(120),
  consentGiven: z.literal(true),
});

/**
 * Credit/payment execution boundary.
 *
 * The browser may drive UX state, but it never owns provider execution.
 * Development mocks and future real adapters both run behind this same server
 * function so provider credentials/raw responses never need to enter React.
 */
export const executeCreditJourney = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => creditExecutionSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");

    const { providers } = await import("@/lib/providers");
    const priceIrr = providers.credit.priceIrr();

    const paymentIntent = await providers.payment.createIntent(priceIrr);
    const payment = await providers.payment.confirm(paymentIntent.id);
    if (payment.status !== "succeeded") {
      throw new Error("credit_payment_not_completed");
    }

    const credit = await providers.credit.check({
      anonSessionId: data.anonSessionId,
      consentGiven: data.consentGiven,
    });

    return {
      priceIrr,
      payment: {
        id: payment.id,
        status: payment.status,
        demo: payment.demo,
      },
      credit,
    };
  });
