import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const paymentAmountSchema = z.object({
  amountIrr: z.number().int().positive().max(10_000_000_000_000),
});

const paymentConfirmSchema = z.object({
  intentId: z.string().min(3).max(200),
});

const creditExecutionSchema = z.object({
  anonSessionId: z.string().min(6).max(120),
  consentGiven: z.literal(true),
});

function noStore(): void {
  setResponseHeader("Cache-Control", "no-store");
}

/** Provider execution stays server-side even while the active adapter is mock. */
export const createCreditPaymentIntent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => paymentAmountSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    const { serverProviders } = await import("@/lib/providers/server-registry.server");
    return serverProviders.payment.createIntent(data.amountIrr);
  });

export const confirmCreditPaymentIntent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => paymentConfirmSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    const { serverProviders } = await import("@/lib/providers/server-registry.server");
    return serverProviders.payment.confirm(data.intentId);
  });

export const executeCreditCheck = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => creditExecutionSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    const { serverProviders } = await import("@/lib/providers/server-registry.server");
    return serverProviders.credit.check({
      anonSessionId: data.anonSessionId,
      consentGiven: data.consentGiven,
    });
  });
