import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runReasoning } from "@/core/engine";
import type { IntentSlots } from "@/core/types";

/**
 * Server-authoritative re-evaluation.
 *
 * The client runs the SAME engine for instant preview and Radar rendering,
 * but every authoritative outcome (eligibility, credit, transaction, partner
 * handoff) must be confirmed here. Phase 1 is stateless: the client submits a
 * validated slot snapshot, the server re-runs the engine and its verdict wins.
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

export const confirmReasoning = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ slots: slotsSchema }).parse(input))
  .handler(async ({ data }) => {
    return runReasoning(data.slots as IntentSlots, {
      computedBy: "server-authoritative",
    });
  });
