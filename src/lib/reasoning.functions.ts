import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildAuthoritativeDecisionEnvelope } from "@/core/decision-envelope";
import type { IntentSlots } from "@/core/types";
import { persistAuthoritativeDecision } from "@/lib/decision-persistence.server";

/**
 * Server-authoritative re-evaluation.
 *
 * The client may run the same deterministic engine for instant preview, but
 * the server owns authoritative confirmation. When explicitly requested at a
 * real value gate, the same result is also persisted atomically to the V2
 * financial OS backend. Client input can never supply an owner user id.
 */

const provenanceSchema = z.object({
  source: z.enum(["user_stated", "user_confirmed", "provider_verified", "catalog", "derived"]),
  confidence: z.number().min(0).max(1),
  asOf: z.string(),
  demo: z.literal(true).optional(),
});

const factOf = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ value, provenance: provenanceSchema }).optional();

const slotsSchema = z.object({
  amount: factOf(z.number().int().nonnegative()),
  purpose: factOf(
    z.enum(["business", "home", "car", "personal", "education", "debt", "marriage", "unknown"]),
  ),
  employment: factOf(
    z.enum([
      "salaried",
      "self_employed",
      "business_owner",
      "retired",
      "student",
      "unemployed",
      "unknown",
    ]),
  ),
  collateral: factOf(z.enum(["property", "vehicle", "deposit", "none", "unknown"])),
  guarantor: factOf(z.enum(["payroll", "business", "none", "unknown"])),
  incomeBand: factOf(z.enum(["under_20", "20_50", "50_100", "over_100", "unknown"])),
  debtLoad: factOf(z.enum(["none", "light", "moderate", "heavy", "unknown"])),
  bankTurnover: factOf(z.enum(["under_50", "50_150", "150_300", "over_300", "unknown"])),
  adverseHistory: factOf(z.enum(["none", "resolved", "active", "unsure", "unknown"])),
  urgency: factOf(z.enum(["immediate", "weeks", "flexible", "unknown"])),
  region: factOf(z.string().max(40)),
});

const contextSchema = z
  .object({
    sessionId: z.string().uuid().nullable().optional(),
    caseId: z.string().uuid().nullable().optional(),
    needText: z.string().max(4000).nullable().optional(),
    persist: z.boolean().optional(),
  })
  .optional();

export const confirmReasoning = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ slots: slotsSchema, context: contextSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const slots = data.slots as IntentSlots;
    const envelope = buildAuthoritativeDecisionEnvelope(slots);

    const persistence = data.context?.persist
      ? await persistAuthoritativeDecision({
          slots,
          envelope,
          context: {
            sessionId: data.context.sessionId,
            caseId: data.context.caseId,
            needText: data.context.needText,
          },
        })
      : ({ status: "disabled", reason: "not_requested" } as const);

    // Preserve the ReasoningTrace top-level shape for existing consumers while
    // adding the broader route and persistence layers as backwards-compatible
    // metadata.
    return {
      ...envelope.reasoning,
      universalNeed: envelope.need,
      routeFamilies: envelope.routeFamilies,
      persistence,
    };
  });
