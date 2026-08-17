import { decideQuoteEvidence } from "./quote-decision";
import type { Quote } from "./quote-intelligence";

const failures: string[] = [];
let count = 0;
const check = (name: string, pass: boolean) => {
  count += 1;
  if (!pass) failures.push(name);
};

const now = "2026-08-15T12:00:00.000Z";
const observation: Quote = {
  id: "observation",
  partnerId: "partner_demo",
  productId: "product_demo",
  source: "PUBLIC_LISTING",
  stage: "MARKET_OBSERVATION",
  observedAt: "2026-08-15T10:00:00.000Z",
  principalToman: 300_000_000,
  tenorMonths: 24,
  sellerAskToman: 100_000,
};
const confirmation = { source: "PROVIDER_OPERATOR" as const, confirmationId: "confirmed_1" };
const live: Quote = {
  ...observation,
  id: "live",
  source: "PROVIDER_OPERATOR",
  stage: "LIVE_CONFIRMED",
  trustedConfirmation: confirmation,
  confirmedAt: "2026-08-15T11:00:00.000Z",
};
const executable: Quote = {
  ...live,
  id: "executable",
  stage: "EXECUTABLE",
  expiresAt: "2026-08-15T12:00:01.000Z",
};
const decide = (quotes: readonly unknown[], finalExecutedToman?: number, at = now) =>
  decideQuoteEvidence({ quotes, now: at, finalExecutedToman });

const empty = decide([]);
check("empty quote set", empty.state === "NO_QUOTE" && empty.nextAction === "GET_QUOTE");
check("observation only", decide([observation]).state === "OBSERVATION_ONLY");
check("observation asks confirmation", decide([observation]).nextAction === "CONFIRM_QUOTE");
check("live confirmed is non-executable", decide([live]).state === "LIVE_NON_EXECUTABLE");
check("live asks for execution terms", decide([live]).nextAction === "COMPLETE_EXECUTION_TERMS");
check("executable is actionable", decide([executable]).state === "EXECUTABLE");
check(
  "executable can proceed",
  decide([executable]).executable &&
    decide([executable]).nextAction === "PROCEED_WITH_EXECUTABLE_QUOTE",
);
check(
  "exact expiry boundary",
  decide([executable], undefined, executable.expiresAt!).state === "EXPIRED",
);
check(
  "expired keeps provenance and refresh action",
  decide([executable], undefined, "2026-08-15T13:00:00Z").selectedQuote?.source ===
    "PROVIDER_OPERATOR" &&
    decide([executable], undefined, "2026-08-15T13:00:00Z").nextAction === "REFRESH_QUOTE",
);
check(
  "future observation is invalid",
  decide([{ ...observation, observedAt: "2026-08-15T12:00:00.001Z" }]).state === "INVALID_EVIDENCE",
);
check(
  "future confirmation is invalid",
  decide([{ ...live, confirmedAt: "2026-08-15T12:00:00.001Z" }]).state === "INVALID_EVIDENCE",
);
check(
  "timezone-less timestamp is invalid",
  decide([{ ...observation, observedAt: "2026-08-15T10:00:00" }]).state === "INVALID_EVIDENCE",
);
check(
  "untrusted executable is invalid",
  decide([{ ...executable, trustedConfirmation: undefined }]).state === "INVALID_EVIDENCE",
);
check(
  "malformed runtime payload is safely reviewed",
  decide([{ id: 123 }]).nextAction === "REVIEW_INVALID_QUOTE",
);
check(
  "executable beats cheaper observation",
  decide([{ ...observation, sellerAskToman: 1 }, executable]).selectedQuote?.quote.id ===
    "executable",
);
const trustedOlder: Quote = {
  ...live,
  id: "trusted_older",
  observedAt: "2026-08-15T09:00:00Z",
};
check(
  "valid trusted evidence beats observation",
  decide([{ ...observation, observedAt: now }, trustedOlder]).selectedQuote?.quote.id ===
    "trusted_older",
);
const sameTimeA: Quote = { ...live, id: "a" };
const sameTimeB: Quote = { ...live, id: "b" };
check(
  "newer observation wins within the same state",
  decide([sameTimeA, { ...sameTimeB, observedAt: "2026-08-15T11:30:00Z" }]).selectedQuote?.quote
    .id === "b",
);
check(
  "recency tie resolves by stable ID",
  decide([sameTimeB, sameTimeA]).selectedQuote?.quote.id === "a",
);
check(
  "stable ID tie is independent of input order",
  decide([sameTimeA, sameTimeB]).selectedQuote?.quote.id ===
    decide([sameTimeB, sameTimeA]).selectedQuote?.quote.id,
);
const newerLive: Quote = { ...live, id: "newer_live", observedAt: "2026-08-15T11:30:00Z" };
const olderLiveWithExpiry: Quote = {
  ...live,
  id: "older_live",
  expiresAt: "2099-01-01T00:00:00Z",
};
check(
  "irrelevant future expiry cannot make older live evidence win",
  decide([olderLiveWithExpiry, newerLive]).selectedQuote?.quote.id === "newer_live",
);
check(
  "timezone-less expiry cannot manipulate live selection",
  decide([{ ...olderLiveWithExpiry, expiresAt: "2099-01-01T00:00:00" }, newerLive]).selectedQuote
    ?.quote.id === "newer_live",
);
const newerObservation: Quote = {
  ...observation,
  id: "newer_observation",
  observedAt: "2026-08-15T11:00:00Z",
};
const olderObservationWithExpiry: Quote = {
  ...observation,
  id: "older_observation",
  observedAt: "2026-08-15T09:00:00Z",
  expiresAt: "2099-01-01T00:00:00Z",
};
check(
  "irrelevant expiry cannot manipulate observation selection",
  decide([olderObservationWithExpiry, newerObservation]).selectedQuote?.quote.id ===
    "newer_observation",
);
check(
  "expiry regression is independent of input order",
  decide([newerLive, olderLiveWithExpiry]).selectedQuote?.quote.id ===
    decide([olderLiveWithExpiry, newerLive]).selectedQuote?.quote.id,
);
const invalidA: Quote = { ...live, id: "invalid_a", observedAt: "not-a-time" };
const invalidZ: Quote = {
  ...live,
  id: "invalid_z",
  observedAt: "9999-01-01T00:00:00Z",
  expiresAt: "9999-01-01T00:00:00Z",
};
check(
  "invalid timestamps provide no ranking advantage",
  decide([invalidZ, invalidA]).selectedQuote?.quote.id === "invalid_a" &&
    decide([invalidA, invalidZ]).selectedQuote?.quote.id === "invalid_a",
);
check("incomplete evidence still has next action", Boolean(decide([observation]).nextAction));
check(
  "unknown is not rejection",
  empty.state === "NO_QUOTE" && empty.readiness === "MISSING" && empty.executable === false,
);
check("better drift", decide([executable], 99_000).drift?.direction === "BETTER");
check("worse drift", decide([executable], 101_000).drift?.direction === "WORSE");
const flat = decide([executable], 100_000).drift;
check(
  "flat drift",
  flat?.calculable === true && flat.direction === "FLAT" && flat.basisPoints === 0,
);
check(
  "non-calculable drift stays non-calculable",
  decide([{ ...executable, sellerAskToman: 0 }], 1).drift === undefined &&
    decide([executable], -1).drift?.calculable === false,
);
check(
  "same input and now are byte-equivalent",
  JSON.stringify(decide([observation, executable], 101_000)) ===
    JSON.stringify(decide([observation, executable], 101_000)),
);

if (failures.length) {
  console.error(`quote decision self-check FAILED:\n - ${failures.join("\n - ")}`);
  process.exit(1);
}
console.log(`quote decision self-check passed (${count} deterministic checks)`);
