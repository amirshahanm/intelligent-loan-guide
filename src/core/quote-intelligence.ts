/**
 * Pure Quote / Price Intelligence domain model.
 *
 * Amounts in this market-maker contract are integer Toman (unlike the wider
 * application catalog, whose canonical storage currency is IRR). A stage is
 * always an explicit assertion: completeness or freshness never promotes it.
 */

import type { Partner, Product } from "./types";

export type QuoteStage = "MARKET_OBSERVATION" | "LIVE_CONFIRMED" | "EXECUTABLE";
export type EffectiveQuoteState = QuoteStage | "EXPIRED";

export type QuoteSourceType =
  "PUBLIC_LISTING" | "PARTNER_API" | "PROVIDER_OPERATOR" | "MANUAL_VERIFIED";

export type TrustedQuoteSource = Exclude<QuoteSourceType, "PUBLIC_LISTING">;

/** Created only at a provider adapter/operator/manual verification boundary. */
export type TrustedConfirmation = {
  source: TrustedQuoteSource;
  confirmationId: string;
};

export type QuoteTerms = {
  principalToman: number;
  tenorMonths: number;
  sellerAskToman: number;
  buyerBidToman?: number;
};

export type Quote = QuoteTerms & {
  id: string;
  /** Existing catalog identifiers; no parallel provider/product ID scheme. */
  partnerId: Partner["id"];
  productId?: Product["id"];
  source: QuoteSourceType;
  observedAt: string;
  stage: QuoteStage;
  trustedConfirmation?: TrustedConfirmation;
  confirmedAt?: string;
  expiresAt?: string;
};

export type QuoteIssueCode =
  | "INVALID_QUOTE_ID"
  | "INVALID_PARTNER_ID"
  | "INVALID_AMOUNT"
  | "INVALID_TENOR"
  | "INVALID_EVALUATION_TIME"
  | "INVALID_OBSERVED_AT"
  | "OBSERVATION_IN_FUTURE"
  | "UNTRUSTED_CONFIRMATION"
  | "MISSING_CONFIRMED_AT"
  | "INVALID_CONFIRMED_AT"
  | "CONFIRMATION_IN_FUTURE"
  | "MISSING_EXPIRES_AT"
  | "INVALID_EXPIRES_AT"
  | "EXPIRY_NOT_AFTER_CONFIRMATION"
  | "PUBLIC_OBSERVATION_CANNOT_BE_EXECUTABLE";

export type QuoteIssue = {
  code: QuoteIssueCode;
  field?: keyof Quote;
  message: string;
};

export type QuoteEvaluation = {
  quote: Quote;
  effectiveState: EffectiveQuoteState;
  issues: QuoteIssue[];
  valid: boolean;
  executable: boolean;
};

const timestamp = (value: string | undefined): number | undefined => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  // Quote time must be portable across runtimes: never let Date.parse assume a
  // machine-local timezone for an otherwise timezone-less date-time.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))
    return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const positiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0;
const nonNegativeInteger = (value: number) => Number.isSafeInteger(value) && value >= 0;
const isTrustedConfirmation = (
  value: TrustedConfirmation | undefined,
): value is TrustedConfirmation =>
  value !== undefined &&
  value.confirmationId.trim().length > 0 &&
  (["PARTNER_API", "PROVIDER_OPERATOR", "MANUAL_VERIFIED"] as const).includes(value.source);

/**
 * Validate and evaluate a quote at an explicitly supplied time.
 * `now >= expiresAt` is expired. No wall-clock access or AI judgment occurs.
 */
export function evaluateQuote(quote: Quote, now: string): QuoteEvaluation {
  const issues: QuoteIssue[] = [];
  const add = (code: QuoteIssueCode, message: string, field?: keyof Quote) =>
    issues.push({ code, message, field });

  const nowMs = timestamp(now);
  if (nowMs === undefined)
    add(
      "INVALID_EVALUATION_TIME",
      "Evaluation time must be a valid timestamp with an explicit timezone.",
    );

  if (!quote.id.trim()) add("INVALID_QUOTE_ID", "Quote id is required.", "id");
  if (!quote.partnerId.trim()) add("INVALID_PARTNER_ID", "Partner id is required.", "partnerId");
  if (!positiveInteger(quote.principalToman))
    add(
      "INVALID_AMOUNT",
      "Principal must be a positive safe integer Toman amount.",
      "principalToman",
    );
  if (!positiveInteger(quote.sellerAskToman))
    add(
      "INVALID_AMOUNT",
      "Seller ask must be a positive safe integer Toman amount.",
      "sellerAskToman",
    );
  if (quote.buyerBidToman !== undefined && !nonNegativeInteger(quote.buyerBidToman))
    add(
      "INVALID_AMOUNT",
      "Buyer bid must be a non-negative safe integer Toman amount.",
      "buyerBidToman",
    );
  if (!positiveInteger(quote.tenorMonths))
    add("INVALID_TENOR", "Tenor must be a positive safe integer month count.", "tenorMonths");

  const observedAt = timestamp(quote.observedAt);
  if (observedAt === undefined)
    add(
      "INVALID_OBSERVED_AT",
      "Observed timestamp must be valid and include an explicit timezone.",
      "observedAt",
    );
  else if (nowMs !== undefined && observedAt > nowMs)
    add(
      "OBSERVATION_IN_FUTURE",
      "observedAt cannot be later than the evaluation time.",
      "observedAt",
    );

  const needsConfirmation = quote.stage !== "MARKET_OBSERVATION";
  const confirmedAt = timestamp(quote.confirmedAt);
  const trusted = isTrustedConfirmation(quote.trustedConfirmation);

  if (needsConfirmation && !trusted)
    add(
      "UNTRUSTED_CONFIRMATION",
      "Live stages require an explicit trusted confirmation.",
      "trustedConfirmation",
    );
  if (needsConfirmation && quote.confirmedAt === undefined)
    add("MISSING_CONFIRMED_AT", "Live stages require confirmedAt.", "confirmedAt");
  else if (needsConfirmation && confirmedAt === undefined)
    add(
      "INVALID_CONFIRMED_AT",
      "confirmedAt must be valid and include an explicit timezone.",
      "confirmedAt",
    );
  else if (
    needsConfirmation &&
    nowMs !== undefined &&
    confirmedAt !== undefined &&
    confirmedAt > nowMs
  )
    add(
      "CONFIRMATION_IN_FUTURE",
      "confirmedAt cannot be later than the evaluation time.",
      "confirmedAt",
    );

  const temporalIntegrityValid =
    nowMs !== undefined && observedAt !== undefined && observedAt <= nowMs;
  const confirmationValid =
    trusted &&
    confirmedAt !== undefined &&
    nowMs !== undefined &&
    confirmedAt <= nowMs &&
    temporalIntegrityValid;
  let effectiveState: EffectiveQuoteState =
    quote.stage === "MARKET_OBSERVATION" || !confirmationValid
      ? "MARKET_OBSERVATION"
      : "LIVE_CONFIRMED";

  if (quote.stage === "EXECUTABLE") {
    const expiresAt = timestamp(quote.expiresAt);
    if (quote.source === "PUBLIC_LISTING" && !trusted)
      add(
        "PUBLIC_OBSERVATION_CANNOT_BE_EXECUTABLE",
        "A public listing alone cannot be executable.",
        "source",
      );
    if (quote.expiresAt === undefined)
      add("MISSING_EXPIRES_AT", "Executable quotes require expiresAt.", "expiresAt");
    else if (expiresAt === undefined)
      add(
        "INVALID_EXPIRES_AT",
        "expiresAt must be valid and include an explicit timezone.",
        "expiresAt",
      );
    else if (confirmedAt !== undefined && expiresAt <= confirmedAt)
      add(
        "EXPIRY_NOT_AFTER_CONFIRMATION",
        "expiresAt must be strictly later than confirmedAt.",
        "expiresAt",
      );
    else if (confirmationValid) {
      effectiveState = nowMs >= expiresAt ? "EXPIRED" : "EXECUTABLE";
    }
  }

  const valid = issues.length === 0;
  if (!valid && effectiveState === "EXECUTABLE") effectiveState = "LIVE_CONFIRMED";

  return {
    quote,
    effectiveState,
    issues,
    valid,
    executable: valid && effectiveState === "EXECUTABLE",
  };
}

export type DriftDirection = "BETTER" | "WORSE" | "FLAT";
export type QuoteToFinalDrift =
  | {
      calculable: true;
      signedDeltaToman: number;
      absoluteDeltaToman: number;
      basisPoints: number;
      direction: DriftDirection;
    }
  | {
      calculable: false;
      reason: "ZERO_QUOTED_ASK" | "INVALID_AMOUNT" | "DRIFT_OUT_OF_RANGE";
      signedDeltaToman?: number;
      absoluteDeltaToman?: number;
      direction?: DriftDirection;
    };

/** Basis points use exact integer arithmetic and round half away from zero. */
export function calculateQuoteToFinalDrift(
  quotedAskToman: number,
  finalExecutedToman: number,
): QuoteToFinalDrift {
  if (!nonNegativeInteger(quotedAskToman) || !nonNegativeInteger(finalExecutedToman))
    return { calculable: false, reason: "INVALID_AMOUNT" };

  const signedDeltaToman = finalExecutedToman - quotedAskToman;
  const absoluteDeltaToman = Math.abs(signedDeltaToman);
  const direction: DriftDirection =
    signedDeltaToman > 0 ? "WORSE" : signedDeltaToman < 0 ? "BETTER" : "FLAT";

  if (quotedAskToman === 0)
    return {
      calculable: false,
      reason: "ZERO_QUOTED_ASK",
      signedDeltaToman,
      absoluteDeltaToman,
      direction,
    };

  const numerator = BigInt(signedDeltaToman) * 10_000n;
  const denominator = BigInt(quotedAskToman);
  const magnitude = numerator < 0n ? -numerator : numerator;
  const roundedMagnitude = (magnitude + denominator / 2n) / denominator;
  const rounded = numerator < 0n ? -roundedMagnitude : roundedMagnitude;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER) || rounded < BigInt(Number.MIN_SAFE_INTEGER))
    return {
      calculable: false,
      reason: "DRIFT_OUT_OF_RANGE",
      signedDeltaToman,
      absoluteDeltaToman,
      direction,
    };

  return {
    calculable: true,
    signedDeltaToman,
    absoluteDeltaToman,
    basisPoints: Number(rounded),
    direction,
  };
}
