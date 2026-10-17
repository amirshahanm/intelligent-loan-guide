import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import pg from "pg";
import { preparePostgresReport, readPostgresReport } from "./postgres.server";
import { requestOwnedReportPayment } from "./report-checkout.server";
import { verifyOwnedReportPayment } from "./report-verification.server";

test(
  "isolated PostgreSQL + simulated gateway: owned order through paid delivery",
  {
    skip: process.env.TASHILRADAR_ISOLATED_REPORT_QA !== "true",
  },
  async () => {
    // This exact loopback URL is a dedicated SSH tunnel to disposable QA storage.
    const url = "postgres://tashilradar_app@127.0.0.1:4197/postgres";
    assert.equal(process.env.TASHILRADAR_DATABASE_URL, url);
    assert.equal(process.env.ZARINPAL_MERCHANT_ID, "synthetic-qa-only");
    const db = new pg.Client({ connectionString: url });
    await db.connect();
    try {
      const sessionId = randomUUID(),
        caseId = randomUUID(),
        sessionCapability = randomUUID();
      await db.query(
        "INSERT INTO tr_local.sessions(id,capability_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
        [sessionId, createHash("sha256").update(sessionCapability).digest("hex")],
      );
      await db.query("INSERT INTO tr_local.cases(id,session_id) VALUES($1,$2)", [
        caseId,
        sessionId,
      ]);
      const text = "Synthetic report content for integration testing only. ".repeat(12);
      const prepared = await preparePostgresReport({ sessionId, sessionCapability, caseId, text });
      const owner = { sessionId, sessionCapability, reportId: prepared.id };
      assert.equal(
        (await preparePostgresReport({ sessionId, sessionCapability, caseId, text })).id,
        prepared.id,
      );
      assert.equal((await readPostgresReport(owner)).text, null);
      await assert.rejects(
        readPostgresReport({ ...owner, sessionCapability: "wrong" }),
        /report_access_denied/,
      );
      let requestCalls = 0,
        verifyCalls = 0;
      const authority = "A".repeat(36);
      const transport: typeof fetch = async (url, init) => {
        assert.equal(JSON.parse(String(init?.body)).amount, 1100000);
        if (String(url).endsWith("request.json")) {
          requestCalls++;
          return Response.json({ data: { code: 100, authority } });
        }
        verifyCalls++;
        return Response.json({ data: { code: 100, ref_id: 123456 } });
      };
      const requests = await Promise.allSettled([
        requestOwnedReportPayment(owner, transport),
        requestOwnedReportPayment(owner, transport),
      ]);
      assert.equal(requests.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(requestCalls, 1);
      assert.equal((await readPostgresReport(owner)).text, null);
      await assert.rejects(
        verifyOwnedReportPayment({ ...owner, authority: "B".repeat(36) }, transport),
        /report_verification_not_claimed/,
      );
      const verification = await Promise.allSettled([
        verifyOwnedReportPayment({ ...owner, authority }, transport),
        verifyOwnedReportPayment({ ...owner, authority }, transport),
      ]);
      assert.equal(verification.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(verifyCalls, 1);
      assert.equal((await readPostgresReport(owner)).text, text);
      const uncertain = await preparePostgresReport({
        sessionId,
        sessionCapability,
        caseId,
        text: text + "uncertain",
      });
      const uncertainOwner = { ...owner, reportId: uncertain.id };
      let failedCalls = 0;
      await assert.rejects(
        requestOwnedReportPayment(uncertainOwner, async () => {
          failedCalls++;
          throw new Error("synthetic timeout");
        }),
        /report_payment_request_uncertain/,
      );
      await assert.rejects(
        requestOwnedReportPayment(uncertainOwner, transport),
        /report_request_not_reserved/,
      );
      assert.equal(failedCalls, 1);
      assert.equal((await readPostgresReport(uncertainOwner)).status, "payment_uncertain");
      assert.equal((await readPostgresReport(uncertainOwner)).text, null);
    } finally {
      await db.end();
    }
  },
);
