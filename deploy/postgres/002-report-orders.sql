BEGIN;
CREATE TABLE IF NOT EXISTS tr_local.report_orders (
 id uuid PRIMARY KEY,
 case_id uuid NOT NULL REFERENCES tr_local.cases(id),
 offer_id text NOT NULL CHECK(offer_id='personal-action-plan-v1'),
 amount_irr integer NOT NULL CHECK(amount_irr=1100000),
 status text NOT NULL DEFAULT 'prepared'
   CHECK(status IN ('prepared','payment_pending','payment_uncertain','paid','delivered')),
 report_text text NOT NULL CHECK(length(btrim(report_text))>=400 AND length(report_text)<=24000),
 content_hash text NOT NULL CHECK(length(content_hash)=64),
 authority text UNIQUE,
 payment_reference text UNIQUE,
 verification_token uuid,
 request_token uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(case_id,offer_id,content_hash),
 CHECK(status NOT IN ('paid','delivered') OR (payment_reference IS NOT NULL AND authority IS NOT NULL))
);
REVOKE ALL ON tr_local.report_orders FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON tr_local.report_orders TO tashilradar_app;
COMMIT;
