import type { DealerInstallmentTerms } from "@/core/installment";

/**
 * Shahan Auto direct installment terms, as published by its owner.
 *
 * Provenance: stated by the owner of Shahan Auto on 2026-11-08 (1405-08-17).
 * Shahan Auto and TashilRadar share an owner; every surface that shows these
 * terms must label Shahan Auto as a TashilRadar partner and must not rank it
 * above other routes because of that relationship.
 *
 * Commercial compensation between the two businesses is intentionally not
 * represented here and must never be shown to users.
 */
export const SHAHAN_AUTO_PARTNER = {
  id: "shahan_auto",
  name: "شاهان اتو",
  kind: "vehicle_dealer" as const,
  relationship: "same_owner" as const,
};

export const SHAHAN_AUTO_INSTALLMENT_TERMS: DealerInstallmentTerms = {
  partnerId: SHAHAN_AUTO_PARTNER.id,
  minDownPaymentPercent: 50,
  minMonths: 1,
  maxMonths: 24,
  monthlyProfitBasisPoints: 450,
  method: "flat_on_financed",
  guarantees: ["sayad_cheque", "promissory_note"],
  promissoryNoteAmount: "negotiable",
  guarantorRequired: false,
  source: { kind: "partner_published", statedBy: "shahan_auto_owner", asOf: "2026-11-08" },
};

/** Public Shahan Auto showroom; verified reachable on 2026-11-08. */
export const SHAHAN_AUTO_PUBLIC_URL = "https://shahanauto.ir";
