import { persistPostgresDecision, consumePostgresLimit } from "../../src/lib/postgres.server";
import { buildAuthoritativeDecisionEnvelope } from "../../src/core/decision-envelope";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import pg from "pg";

const slots = {};
const envelope = buildAuthoritativeDecisionEnvelope(slots, "آزمون فنی بدون اطلاعات شخصی");
const first = await persistPostgresDecision({ slots, envelope });
assert.equal(first.status, "persisted");
if (first.status !== "persisted") throw new Error("not_persisted");
const second = await persistPostgresDecision({ slots, envelope, context: first });
assert.equal(second.status === "persisted" && second.reused, true);
assert.equal(second.status === "persisted" && second.decisionRunId, first.decisionRunId);
await assert.rejects(
  () =>
    persistPostgresDecision({
      slots,
      envelope,
      context: { ...first, sessionCapability: "0".repeat(64) },
    }),
  /invalid_anonymous_session_capability/,
);
const other = await persistPostgresDecision({ slots, envelope });
if (other.status !== "persisted") throw new Error("not_persisted");
await assert.rejects(
  () => persistPostgresDecision({ slots, envelope, context: { ...other, caseId: first.caseId } }),
  /case_access_denied/,
);
const key = randomBytes(32).toString("hex");
const limits = await Promise.all(
  Array.from({ length: 6 }, () => consumePostgresLimit(key, "deployment_probe", 3, 600)),
);
assert.equal(limits.filter((value) => value.allowed).length, 3);
const db = new pg.Pool({ connectionString: process.env.TASHILRADAR_DATABASE_URL });
const stored = await db.query("SELECT capability_hash FROM tr_local.sessions WHERE id=$1", [
  first.sessionId,
]);
assert.notEqual(stored.rows[0].capability_hash, first.sessionCapability);
await db.query("UPDATE tr_local.sessions SET expires_at=now()-interval '1 second' WHERE id=$1", [
  first.sessionId,
]);
await assert.rejects(
  () => persistPostgresDecision({ slots, envelope, context: first }),
  /invalid_anonymous_session_capability/,
);
await db.end();
console.log(
  JSON.stringify({
    persistence: "PASS",
    idempotency: "PASS",
    invalid_capability: "PASS",
    cross_case_isolation: "PASS",
    concurrent_rate_limit: "PASS",
    hashed_capability: "PASS",
    expiry: "PASS",
    syntheticSessionIds: [first.sessionId, other.sessionId],
  }),
);
process.exit(0);
