/**
 * Quote Intelligence adapter for the product decision journey.
 *
 * This module owns selection and forgiving next-action semantics only. The
 * authoritative Quote Intelligence evaluator continues to own validity,
 * effective state, trust, and expiry.
 */
import {
  calculateQuoteToFinalDrift,
  evaluateQuote,
  type EffectiveQuoteState,
  type Quote,
  type QuoteEvaluation,
  type QuoteIssue,
  type QuoteSourceType,
  type QuoteTerms,
  type QuoteToFinalDrift,
} from "./quote-intelligence";

export type QuoteDecisionState =
  | "NO_QUOTE"
  | "OBSERVATION_ONLY"
  | "LIVE_NON_EXECUTABLE"
  | "EXECUTABLE"
  | "EXPIRED"
  | "INVALID_EVIDENCE";

export type QuoteEvidenceReadiness =
  "MISSING" | "INDICATIVE" | "CONFIRMED" | "ACTIONABLE" | "STALE" | "REQUIRES_REVIEW";

export type QuoteNextAction =
  | "GET_QUOTE"
  | "CONFIRM_QUOTE"
  | "COMPLETE_EXECUTION_TERMS"
  | "PROCEED_WITH_EXECUTABLE_QUOTE"
  | "REFRESH_QUOTE"
  | "REVIEW_INVALID_QUOTE";

export type QuoteDecisionIssue =
  | QuoteIssue
  | {
      code: "MALFORMED_QUOTE_PAYLOAD";
      message: string;
      candidateIndex: number;
    };

export type SelectedQuoteEvidence = {
  quote: Quote;
  effectiveState: EffectiveQuoteState;
  source: QuoteSourceType;
  observedAt: string;
  confirmedAt?: string;
  expiresAt?: string;
  terms: QuoteTerms;
};

type DecisionBase = {
  executable: boolean;
  readiness: QuoteEvidenceReadiness;
  nextAction: QuoteNextAction;
  issues: QuoteDecisionIssue[];
  drift?: QuoteToFinalDrift;
};

export type QuoteDecision =
  | (DecisionBase & { state: "NO_QUOTE"; selectedQuote?: never })
  | (DecisionBase & {
      state: Exclude<QuoteDecisionState, "NO_QUOTE">;
      selectedQuote?: SelectedQuoteEvidence;
    });

export type QuoteDecisionInput = {
  /** Runtime payloads are deliberately unknown until this boundary validates them. */
  quotes: readonly unknown[];
  /** Must include an explicit timezone; Quote Intelligence validates it. */
  now: string;
  /** Integer Toman. It is never inferred or converted from the catalog's IRR values. */
  finalExecutedToman?: number;
};

const quoteStages = ["MARKET_OBSERVATION", "LIVE_CONFIRMED", "EXECUTABLE"] as const;
const quoteSources = [
  "PUBLIC_LISTING",
  "PARTNER_API",
  "PROVIDER_OPERATOR",
  "MANUAL_VERIFIED",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Only protects evaluateQuote from unsafe runtime shapes; financial validation remains there. */
function asEvaluableQuote(value: unknown): Quote | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.id !== "string" ||
    typeof value.partnerId !== "string" ||
    typeof value.observedAt !== "string" ||
    typeof value.principalToman !== "number" ||
    typeof value.tenorMonths !== "number" ||
    typeof value.sellerAskToman !== "number" ||
    !quoteStages.includes(value.stage as (typeof quoteStages)[number]) ||
    !quoteSources.includes(value.source as (typeof quoteSources)[number])
  )
    return undefined;
  if (value.productId !== undefined && typeof value.productId !== "string") return undefined;
  if (value.buyerBidToman !== undefined && typeof value.buyerBidToman !== "number")
    return undefined;
  if (value.confirmedAt !== undefined && typeof value.confirmedAt !== "string") return undefined;
  if (value.expiresAt !== undefined && typeof value.expiresAt !== "string") return undefined;
  if (value.trustedConfirmation !== undefined) {
    if (!isRecord(value.trustedConfirmation)) return undefined;
    if (
      typeof value.trustedConfirmation.source !== "string" ||
      typeof value.trustedConfirmation.confirmationId !== "string"
    )
      return undefined;
  }
  return value as Quote;
}

const timeRank = (value: string | undefined) => {
  const parsed = value === undefined ? Number.NEGATIVE_INFINITY : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const stateRank: Record<EffectiveQuoteState, number> = {
  EXECUTABLE: 4,
  LIVE_CONFIRMED: 3,
  EXPIRED: 2,
  MARKET_OBSERVATION: 1,
};

/**
 * Financial-usability ordering (highest first): validity, effective state,
 * authoritative expiry for EXECUTABLE/EXPIRED evidence, validated observation
 * recency, then code-unit-ordered quote ID. Invalid candidates skip all temporal
 * fields. Input order is the final fallback only for duplicate IDs.
 */
function compareCandidates(
  left: { evaluation: QuoteEvaluation; index: number },
  right: { evaluation: QuoteEvaluation; index: number },
) {
  const l = left.evaluation;
  const r = right.evaluation;
  const valid = Number(r.valid) - Number(l.valid);
  if (valid) return valid;
  if (!l.valid && !r.valid) {
    const id = l.quote.id < r.quote.id ? -1 : l.quote.id > r.quote.id ? 1 : 0;
    return id || left.index - right.index;
  }
  const state = stateRank[r.effectiveState] - stateRank[l.effectiveState];
  if (state) return state;
  if (l.valid && r.valid) {
    const expiryIsAuthoritative =
      l.effectiveState === "EXECUTABLE" || l.effectiveState === "EXPIRED";
    if (expiryIsAuthoritative) {
      const expiry = timeRank(r.quote.expiresAt) - timeRank(l.quote.expiresAt);
      if (expiry) return expiry;
    }
    const recency = timeRank(r.quote.observedAt) - timeRank(l.quote.observedAt);
    if (recency) return recency;
  }
  const id = l.quote.id < r.quote.id ? -1 : l.quote.id > r.quote.id ? 1 : 0;
  return id || left.index - right.index;
}

const selectedEvidence = (evaluation: QuoteEvaluation): SelectedQuoteEvidence => ({
  quote: evaluation.quote,
  effectiveState: evaluation.effectiveState,
  source: evaluation.quote.source,
  observedAt: evaluation.quote.observedAt,
  confirmedAt: evaluation.quote.confirmedAt,
  expiresAt: evaluation.quote.expiresAt,
  terms: {
    principalToman: evaluation.quote.principalToman,
    tenorMonths: evaluation.quote.tenorMonths,
    sellerAskToman: evaluation.quote.sellerAskToman,
    buyerBidToman: evaluation.quote.buyerBidToman,
  },
});

/** Pure, deterministic decision adapter. No wall-clock reads and no state promotion. */
export function decideQuoteEvidence(input: QuoteDecisionInput): QuoteDecision {
  const malformed: QuoteDecisionIssue[] = [];
  const candidates = input.quotes.flatMap((payload, index) => {
    const quote = asEvaluableQuote(payload);
    if (!quote) {
      malformed.push({
        code: "MALFORMED_QUOTE_PAYLOAD",
        message: "Quote payload is not structurally safe to evaluate.",
        candidateIndex: index,
      });
      return [];
    }
    return [{ evaluation: evaluateQuote(quote, input.now), index }];
  });

  if (candidates.length === 0) {
    return malformed.length === 0
      ? {
          state: "NO_QUOTE",
          executable: false,
          readiness: "MISSING",
          nextAction: "GET_QUOTE",
          issues: [],
        }
      : {
          state: "INVALID_EVIDENCE",
          executable: false,
          readiness: "REQUIRES_REVIEW",
          nextAction: "REVIEW_INVALID_QUOTE",
          issues: malformed,
        };
  }

  const chosen = [...candidates].sort(compareCandidates)[0]!.evaluation;
  const issues = [...chosen.issues, ...malformed];
  const selectedQuote = selectedEvidence(chosen);
  const drift =
    !chosen.valid || input.finalExecutedToman === undefined
      ? undefined
      : calculateQuoteToFinalDrift(chosen.quote.sellerAskToman, input.finalExecutedToman);

  if (!chosen.valid)
    return {
      state: "INVALID_EVIDENCE",
      selectedQuote,
      executable: false,
      readiness: "REQUIRES_REVIEW",
      nextAction: "REVIEW_INVALID_QUOTE",
      issues,
      drift,
    };
  if (chosen.effectiveState === "EXECUTABLE")
    return {
      state: "EXECUTABLE",
      selectedQuote,
      executable: true,
      readiness: "ACTIONABLE",
      nextAction: "PROCEED_WITH_EXECUTABLE_QUOTE",
      issues,
      drift,
    };
  if (chosen.effectiveState === "EXPIRED")
    return {
      state: "EXPIRED",
      selectedQuote,
      executable: false,
      readiness: "STALE",
      nextAction: "REFRESH_QUOTE",
      issues,
      drift,
    };
  if (chosen.effectiveState === "LIVE_CONFIRMED")
    return {
      state: "LIVE_NON_EXECUTABLE",
      selectedQuote,
      executable: false,
      readiness: "CONFIRMED",
      nextAction: "COMPLETE_EXECUTION_TERMS",
      issues,
      drift,
    };
  return {
    state: "OBSERVATION_ONLY",
    selectedQuote,
    executable: false,
    readiness: "INDICATIVE",
    nextAction: "CONFIRM_QUOTE",
    issues,
    drift,
  };
}
