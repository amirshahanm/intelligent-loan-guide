import pg from "pg";
import { REPORT_OFFER, validatePreparedReport } from "./report-policy";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import {
  semanticDecisionSnapshot,
  type AuthoritativeDecisionEnvelope,
} from "@/core/decision-envelope";
import type { IntentSlots } from "@/core/types";
import { stableJson, type DecisionPersistenceResult } from "./decision-persistence.server";

let pool: pg.Pool | undefined;
export function postgresEnabled(): boolean {
  return process.env.TASHILRADAR_BACKEND === "postgres";
}
function database(): pg.Pool {
  if (!postgresEnabled() || !process.env.TASHILRADAR_DATABASE_URL) {
    throw new Error("postgres_backend_not_configured");
  }
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.TASHILRADAR_DATABASE_URL,
      max: 4,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: 10000,
      application_name: "tashilradar",
    });
    // Never log connection strings, query payloads or raw database errors.
    pool.on("error", () => console.error("TashilRadar database connection unavailable"));
  }
  return pool;
}
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function reservePostgresReportRequest(input: {
  reportId: string;
  sessionId: string;
  sessionCapability: string;
}) {
  const token = randomUUID();
  const result = await database()
    .query(
      `UPDATE tr_local.report_orders r SET request_token=$1,status='payment_pending'
     FROM tr_local.cases c JOIN tr_local.sessions s ON s.id=c.session_id
     WHERE r.id=$2 AND r.case_id=c.id AND s.id=$3 AND s.capability_hash=$4
     AND s.expires_at>now() AND r.status='prepared' AND r.request_token IS NULL
     AND r.amount_irr=$5 RETURNING r.id`,
      [
        token,
        input.reportId,
        input.sessionId,
        hash(input.sessionCapability),
        REPORT_OFFER.amountIrr,
      ],
    )
    .catch(() => {
      throw new Error("report_storage_unavailable");
    });
  if (!result.rowCount) throw new Error("report_request_not_reserved");
  return token;
}

export async function attachPostgresReportAuthority(input: {
  reportId: string;
  token: string;
  authority: string | null;
}) {
  if (input.authority !== null && !/^[A-Za-z0-9]{16,64}$/.test(input.authority))
    throw new Error("invalid_payment_authority");
  const result = await database()
    .query(
      `UPDATE tr_local.report_orders SET authority=$1,status=$2
     WHERE id=$3 AND request_token=$4 AND status='payment_pending' AND authority IS NULL
     RETURNING id`,
      [
        input.authority,
        input.authority ? "payment_pending" : "payment_uncertain",
        input.reportId,
        input.token,
      ],
    )
    .catch(() => {
      throw new Error("report_request_attachment_uncertain");
    });
  if (!result.rowCount) throw new Error("report_request_attachment_not_applied");
}

// Claim once before contacting the provider. Callback parameters never mark paid.
export async function claimPostgresReportVerification(input: {
  reportId: string;
  sessionId: string;
  sessionCapability: string;
  authority: string;
}) {
  const token = randomUUID();
  try {
    const result = await database().query(
      `UPDATE tr_local.report_orders r SET verification_token=$1
       FROM tr_local.cases c JOIN tr_local.sessions s ON s.id=c.session_id
       WHERE r.id=$2 AND r.case_id=c.id AND s.id=$3 AND s.capability_hash=$4
       AND s.expires_at>now() AND r.authority=$5 AND r.status='payment_pending'
       AND r.verification_token IS NULL RETURNING r.amount_irr`,
      [token, input.reportId, input.sessionId, hash(input.sessionCapability), input.authority],
    );
    if (!result.rowCount) throw new Error("report_verification_not_claimed");
    if (result.rows[0].amount_irr !== REPORT_OFFER.amountIrr)
      throw new Error("report_amount_mismatch");
    return token;
  } catch (error) {
    if (
      error instanceof Error &&
      ["report_verification_not_claimed", "report_amount_mismatch"].includes(error.message)
    )
      throw error;
    throw new Error("report_storage_unavailable");
  }
}

// Only server orchestration may supply this result, never a browser payload.
export async function settlePostgresReportVerification(input: {
  reportId: string;
  token: string;
  result: { status: "verified"; reference: string } | { status: "uncertain" };
}) {
  if (input.result.status === "verified" && !/^[1-9]\d{0,31}$/.test(input.result.reference))
    throw new Error("invalid_payment_reference");
  try {
    const paid = input.result.status === "verified";
    const result = await database().query(
      `UPDATE tr_local.report_orders SET status=$1,payment_reference=$2
       WHERE id=$3 AND verification_token=$4 AND status='payment_pending'
       RETURNING id,status`,
      [
        paid ? "paid" : "payment_uncertain",
        paid ? (input.result as { reference: string }).reference : null,
        input.reportId,
        input.token,
      ],
    );
    if (!result.rowCount) throw new Error("report_settlement_not_applied");
    return result.rows[0] as { id: string; status: string };
  } catch (error) {
    if (error instanceof Error && error.message === "report_settlement_not_applied") throw error;
    throw new Error("report_settlement_uncertain");
  }
}

// Internal API: no browser-callable payment or status mutation is exposed here.
export async function preparePostgresReport(input: {
  sessionId: string;
  sessionCapability: string;
  caseId: string;
  text: string;
}) {
  if (!validatePreparedReport(input.text)) throw new Error("invalid_prepared_report");
  const id = randomUUID();
  try {
    const result = await database().query(
      `INSERT INTO tr_local.report_orders(id,case_id,offer_id,amount_irr,report_text,content_hash)
       SELECT $1,c.id,$2,$3,$4,$5 FROM tr_local.cases c
       JOIN tr_local.sessions s ON s.id=c.session_id
       WHERE c.id=$6 AND s.id=$7 AND s.capability_hash=$8 AND s.expires_at>now()
       ON CONFLICT(case_id,offer_id,content_hash) DO UPDATE SET content_hash=EXCLUDED.content_hash
       RETURNING id,status,amount_irr`,
      [
        id,
        REPORT_OFFER.id,
        REPORT_OFFER.amountIrr,
        input.text,
        hash(input.text),
        input.caseId,
        input.sessionId,
        hash(input.sessionCapability),
      ],
    );
    if (!result.rowCount) throw new Error("report_access_denied");
    return result.rows[0] as { id: string; status: string; amount_irr: number };
  } catch (error) {
    if (error instanceof Error && error.message === "report_access_denied") throw error;
    throw new Error("report_storage_unavailable");
  }
}

export async function readPostgresReport(input: {
  reportId: string;
  sessionId: string;
  sessionCapability: string;
}) {
  try {
    const result = await database().query(
      `SELECT r.id,r.status,r.amount_irr,
       CASE WHEN r.status IN ('paid','delivered') AND r.payment_reference IS NOT NULL
         THEN r.report_text ELSE NULL END AS text
       FROM tr_local.report_orders r JOIN tr_local.cases c ON c.id=r.case_id
       JOIN tr_local.sessions s ON s.id=c.session_id
       WHERE r.id=$1 AND s.id=$2 AND s.capability_hash=$3 AND s.expires_at>now()`,
      [input.reportId, input.sessionId, hash(input.sessionCapability)],
    );
    if (!result.rowCount) throw new Error("report_access_denied");
    return result.rows[0] as {
      id: string;
      status: string;
      amount_irr: number;
      text: string | null;
    };
  } catch (error) {
    if (error instanceof Error && error.message === "report_access_denied") throw error;
    throw new Error("report_storage_unavailable");
  }
}

export async function persistPostgresDecision(input: {
  slots: IntentSlots;
  envelope: AuthoritativeDecisionEnvelope;
  context?: {
    ownerUserId?: string | null;
    sessionId?: string | null;
    sessionCapability?: string | null;
    caseId?: string | null;
    needText?: string | null;
  };
}): Promise<DecisionPersistenceResult> {
  // Verified phone identities are a separate release gate; never downgrade them to anonymous.
  if (input.context?.ownerUserId) throw new Error("postgres_identity_not_enabled");
  if (input.context?.caseId && !input.context.sessionId) throw new Error("invalid_case_context");
  const client = await database().connect();
  const sessionId = input.context?.sessionId ?? randomUUID();
  const capability = input.context?.sessionId
    ? input.context.sessionCapability
    : randomBytes(32).toString("hex");
  if (!capability) {
    client.release();
    throw new Error("invalid_anonymous_session_capability");
  }
  try {
    await client.query("BEGIN");
    if (input.context?.sessionId) {
      const result = await client.query(
        "SELECT id FROM tr_local.sessions WHERE id=$1 AND capability_hash=$2 AND expires_at>now() FOR UPDATE",
        [sessionId, hash(capability)],
      );
      if (!result.rowCount) throw new Error("invalid_anonymous_session_capability");
    } else {
      await client.query(
        "INSERT INTO tr_local.sessions(id,capability_hash,expires_at) VALUES($1,$2,now()+interval '14 days')",
        [sessionId, hash(capability)],
      );
    }
    let caseId = input.context?.caseId;
    if (caseId) {
      const found = await client.query(
        "SELECT id FROM tr_local.cases WHERE id=$1 AND session_id=$2 FOR UPDATE",
        [caseId, sessionId],
      );
      if (!found.rowCount) throw new Error("case_access_denied");
    } else {
      // Resume the same session's existing case when a client has not yet retained its case ID.
      const found = await client.query(
        "SELECT id FROM tr_local.cases WHERE session_id=$1 ORDER BY created_at LIMIT 1 FOR UPDATE",
        [sessionId],
      );
      caseId = found.rows[0]?.id ?? randomUUID();
      if (!found.rowCount)
        await client.query("INSERT INTO tr_local.cases(id,session_id) VALUES($1,$2)", [
          caseId,
          sessionId,
        ]);
    }
    const output = semanticDecisionSnapshot(input.envelope);
    const values = [
      caseId,
      hash(stableJson(input.slots)),
      hash(stableJson(output)),
      "reasoning-core-v1",
      "founder-lock-2026-08-24",
    ];
    const existing = await client.query(
      "SELECT id FROM tr_local.decision_runs WHERE case_id=$1 AND input_hash=$2 AND output_hash=$3 AND engine_version=$4 AND ruleset_version=$5",
      values,
    );
    const runId = existing.rows[0]?.id ?? randomUUID();
    if (!existing.rowCount)
      await client.query(
        "INSERT INTO tr_local.decision_runs(case_id,input_hash,output_hash,engine_version,ruleset_version,id,input_snapshot,output_snapshot,routes,world,vertical) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
        [
          ...values,
          runId,
          JSON.stringify(input.slots),
          JSON.stringify(output),
          JSON.stringify(input.envelope.persistableRoutes),
          input.envelope.primaryWorld,
          input.envelope.vertical,
        ],
      );
    await client.query("UPDATE tr_local.cases SET active_run_id=$1 WHERE id=$2", [runId, caseId]);
    await client.query("COMMIT");
    return {
      status: "persisted",
      sessionId,
      sessionCapability: capability,
      caseId: caseId!,
      decisionRunId: runId,
      reused: Boolean(existing.rowCount),
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (
      error instanceof Error &&
      ["invalid_anonymous_session_capability", "case_access_denied"].includes(error.message)
    )
      throw error;
    throw new Error("decision_persistence_backend_failure");
  } finally {
    client.release();
  }
}

export async function consumePostgresLimit(
  keyHash: string,
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  const result = await database().query(
    `INSERT INTO tr_local.rate_windows(key_hash,scope,window_start,count,expires_at)
     VALUES($1,$2,floor(extract(epoch FROM now())/$3)::bigint,1,
       to_timestamp((floor(extract(epoch FROM now())/$3)+1)*$3))
     ON CONFLICT(key_hash,scope,window_start) DO UPDATE SET count=tr_local.rate_windows.count+1
     RETURNING count,expires_at`,
    [keyHash, scope, windowSeconds],
  );
  const row = result.rows[0];
  return {
    allowed: row.count <= limit,
    count: row.count,
    limit,
    reset_at: row.expires_at.toISOString(),
  };
}
