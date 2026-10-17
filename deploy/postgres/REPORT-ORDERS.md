# Report order storage

`002-report-orders.sql` is an additive migration, not yet applied to production.
Apply after `001-decisions.sql` only during an approved release. Preparation and
reading reuse the existing PostgreSQL pool and expiring anonymous-session
capability. Identical case/offer/content preparations reuse the stored order.
Unpaid reads return metadata only, never report text. This is internal storage,
not a browser checkout endpoint. No payment-status mutation is exposed.

Before checkout activation: configure the merchant, add browser endpoints and
recovery, and provide operational reconciliation of ambiguous/duplicate results.
Internal request orchestration reserves the owned order atomically before the
provider call and binds authority before returning a redirect. Failed/ambiguous
requests become uncertain and cannot automatically retry. Internal verification
orchestration now claims the pending order atomically, requires the owning
unexpired session and matching stored authority, and settles only the matching
claim. Provider ambiguity or duplicate verification remains uncertain rather
than granting access. It is disabled unless TASHILRADAR_REPORT_PAYMENTS=true
and ZARINPAL_MERCHANT_ID is configured. No browser endpoint calls it yet.

Isolated PostgreSQL QA passed migration application and the synthetic SQL checks
in report-orders.qa.sql: unpaid isolation, wrong capability, proof constraint,
single verification claim, paid read and expiry. This is SQL runtime evidence,
not an end-to-end checkout or concurrent load test. The public database was not
migrated. Reapplying CREATE TABLE IF NOT EXISTS does not upgrade an earlier
schema; an existing deployed report table would require an explicit migration.

The separate report-flow.integration.test.ts also passed against a disposable
PostgreSQL instance using the actual storage and orchestration functions with
an injected synthetic gateway transport. It covers duplicate preparation,
ownership rejection, unpaid withholding, two concurrent request calls (one
provider call), mismatched authority rejection, two concurrent verification
calls (one provider call), paid delivery and request timeout/no automatic retry.
This is server-side end-to-end evidence, not browser or live payment evidence.
The test is skipped by default and requires explicit isolated-QA configuration;
it rejects any database URL except its dedicated loopback tunnel URL.

Rollback before activation: disable callers and retain the additive table.
Do not drop paid records or report text as an automatic rollback.
Anonymous access currently expires with the existing 14-day session. Durable
paid access requires verified identity or a separately designed recovery path
before public sales. Report length validation is not semantic quality review.
