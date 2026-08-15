import { calculateQuoteToFinalDrift, evaluateQuote, type Quote } from "./quote-intelligence";

const failures: string[] = [];
const check = (name: string, pass: boolean) => {
  if (!pass) failures.push(name);
};
const now = "2026-08-14T12:00:00.000Z";
const base: Quote = {
  id: "quote_1",
  partnerId: "partner_demo",
  productId: "product_demo",
  principalToman: 300_000_000,
  tenorMonths: 24,
  sellerAskToman: 75_000_000,
  observedAt: "2026-08-14T11:59:59.000Z",
  source: "PUBLIC_LISTING",
  stage: "MARKET_OBSERVATION",
};
const confirmation = { source: "PROVIDER_OPERATOR" as const, confirmationId: "confirm_1" };
const live: Quote = {
  ...base,
  source: "PROVIDER_OPERATOR",
  stage: "LIVE_CONFIRMED",
  trustedConfirmation: confirmation,
  confirmedAt: "2026-08-14T11:00:00.000Z",
};
const executable: Quote = {
  ...live,
  stage: "EXECUTABLE",
  expiresAt: "2026-08-14T12:00:01.000Z",
};

check(
  "public listing is observation",
  evaluateQuote(base, now).effectiveState === "MARKET_OBSERVATION",
);
check(
  "recent public is not live",
  evaluateQuote({ ...base, observedAt: now }, now).effectiveState !== "LIVE_CONFIRMED",
);
check(
  "complete public fields are not executable",
  !evaluateQuote(
    { ...base, stage: "EXECUTABLE", confirmedAt: now, expiresAt: "2026-08-15T00:00:00Z" },
    now,
  ).executable,
);
check(
  "public source cannot forge trusted confirmation",
  !evaluateQuote(
    {
      ...executable,
      source: "PUBLIC_LISTING",
      trustedConfirmation: {
        source: "PUBLIC_LISTING",
        confirmationId: "not_trusted",
      } as unknown as Quote["trustedConfirmation"],
    },
    now,
  ).executable,
);
check("trusted confirmation is live", evaluateQuote(live, now).effectiveState === "LIVE_CONFIRMED");
check("live without expiry is not executable", !evaluateQuote(live, now).executable);
check("executable requirements pass", evaluateQuote(executable, now).executable);
const invalidNow = evaluateQuote(executable, "not-a-time");
check(
  "invalid evaluation time is explicit and never live",
  !invalidNow.valid &&
    !invalidNow.executable &&
    invalidNow.effectiveState === "MARKET_OBSERVATION" &&
    invalidNow.issues.some((issue) => issue.code === "INVALID_EVALUATION_TIME"),
);
const futureConfirmation = evaluateQuote(
  { ...executable, confirmedAt: "2026-08-14T12:00:00.001Z" },
  now,
);
check(
  "future confirmation is never live or executable",
  !futureConfirmation.executable &&
    futureConfirmation.effectiveState === "MARKET_OBSERVATION" &&
    futureConfirmation.issues.some((issue) => issue.code === "CONFIRMATION_IN_FUTURE"),
);
const confirmationAtNow = evaluateQuote(
  {
    ...executable,
    confirmedAt: now,
    expiresAt: "2026-08-14T12:00:00.001Z",
  },
  now,
);
check("confirmation exactly at now is allowed", confirmationAtNow.executable);
check(
  "timezone-less timestamp is rejected",
  evaluateQuote({ ...base, observedAt: "2026-08-15T10:00:00" }, "2026-08-15T14:00:00Z").issues.some(
    (issue) => issue.code === "INVALID_OBSERVED_AT",
  ),
);
check(
  "explicit Z timestamp is accepted",
  !evaluateQuote(
    { ...base, observedAt: "2026-08-15T10:00:00Z" },
    "2026-08-15T14:00:00Z",
  ).issues.some((issue) => issue.code === "INVALID_OBSERVED_AT"),
);
check(
  "explicit offset timestamp is accepted",
  !evaluateQuote(
    { ...base, observedAt: "2026-08-15T13:30:00+03:30" },
    "2026-08-15T14:00:00Z",
  ).issues.some((issue) => issue.code === "INVALID_OBSERVED_AT"),
);
const futureObservation = evaluateQuote(
  { ...executable, observedAt: "2026-08-14T12:00:00.001Z" },
  now,
);
check(
  "future observation is explicit and non-executable",
  !futureObservation.valid &&
    !futureObservation.executable &&
    futureObservation.issues.some((issue) => issue.code === "OBSERVATION_IN_FUTURE"),
);
check(
  "expiry must follow confirmation",
  evaluateQuote({ ...executable, expiresAt: executable.confirmedAt }, now).issues.some(
    (issue) => issue.code === "EXPIRY_NOT_AFTER_CONFIRMATION",
  ),
);
check(
  "just before expiry is executable",
  evaluateQuote(executable, now).effectiveState === "EXECUTABLE",
);
const atExpiry = evaluateQuote(executable, executable.expiresAt!);
check("exact expiry is expired", atExpiry.effectiveState === "EXPIRED" && !atExpiry.executable);
check(
  "after expiry is expired",
  evaluateQuote(executable, "2026-08-14T13:00:00Z").effectiveState === "EXPIRED",
);
check(
  "expired retains provenance",
  atExpiry.quote.source === executable.source &&
    atExpiry.quote.sellerAskToman === executable.sellerAskToman,
);
check("negative money rejected", !evaluateQuote({ ...base, sellerAskToman: -1 }, now).valid);
check(
  "non-finite money rejected",
  !evaluateQuote({ ...base, principalToman: Number.NaN }, now).valid,
);
check("invalid tenor rejected", !evaluateQuote({ ...base, tenorMonths: 1.5 }, now).valid);
check(
  "evaluation deterministic",
  JSON.stringify(evaluateQuote(executable, now)) === JSON.stringify(evaluateQuote(executable, now)),
);
check("worse drift", calculateQuoteToFinalDrift(100_000, 101_000).direction === "WORSE");
check("better drift", calculateQuoteToFinalDrift(100_000, 99_000).direction === "BETTER");
const flat = calculateQuoteToFinalDrift(100_000, 100_000);
check("flat drift", flat.direction === "FLAT" && flat.calculable && flat.basisPoints === 0);
const roundedDrift = calculateQuoteToFinalDrift(20_000, 20_001);
check("bps rounds half away from zero", roundedDrift.calculable && roundedDrift.basisPoints === 1);
check("zero denominator safe", calculateQuoteToFinalDrift(0, 1).calculable === false);
check(
  "observation never implicitly promoted",
  evaluateQuote({ ...base, buyerBidToman: 74_000_000 }, now).effectiveState ===
    "MARKET_OBSERVATION",
);

if (failures.length) {
  console.error(`quote intelligence self-check FAILED:\n - ${failures.join("\n - ")}`);
  process.exit(1);
}
console.log("quote intelligence self-check passed (29 deterministic checks)");
