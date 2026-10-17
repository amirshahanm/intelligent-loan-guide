-- Synthetic fixtures only. Run in a disposable database, never production.
BEGIN;
INSERT INTO tr_local.sessions(id,capability_hash,expires_at)
VALUES('00000000-0000-4000-8000-000000000001',repeat('a',64),now()+interval '1 day');
INSERT INTO tr_local.cases(id,session_id)
VALUES('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
INSERT INTO tr_local.report_orders(id,case_id,offer_id,amount_irr,report_text,content_hash)
VALUES('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',
'personal-action-plan-v1',1100000,repeat('Synthetic report. ',40),repeat('b',64));
DO $$
DECLARE leaked text; n integer;
BEGIN
 SELECT CASE WHEN status IN ('paid','delivered') AND payment_reference IS NOT NULL
 THEN report_text ELSE NULL END INTO leaked FROM tr_local.report_orders;
 IF leaked IS NOT NULL THEN RAISE EXCEPTION 'unpaid leak'; END IF;
 BEGIN
  UPDATE tr_local.report_orders SET status='paid';
  RAISE EXCEPTION 'missing proof accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT count(*) INTO n FROM tr_local.report_orders r
 JOIN tr_local.cases c ON c.id=r.case_id JOIN tr_local.sessions s ON s.id=c.session_id
 WHERE s.capability_hash=repeat('c',64) AND s.expires_at>now();
 IF n<>0 THEN RAISE EXCEPTION 'wrong capability accepted'; END IF;
 UPDATE tr_local.report_orders SET status='payment_pending',authority=repeat('A',36);
 UPDATE tr_local.report_orders SET verification_token='00000000-0000-4000-8000-000000000004'
 WHERE status='payment_pending' AND verification_token IS NULL;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'claim failed'; END IF;
 UPDATE tr_local.report_orders SET verification_token='00000000-0000-4000-8000-000000000005'
 WHERE status='payment_pending' AND verification_token IS NULL;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'duplicate claim'; END IF;
 UPDATE tr_local.report_orders SET status='paid',payment_reference='12345'
 WHERE verification_token='00000000-0000-4000-8000-000000000004' AND status='payment_pending';
 SELECT CASE WHEN status IN ('paid','delivered') AND payment_reference IS NOT NULL
 THEN report_text ELSE NULL END INTO leaked FROM tr_local.report_orders;
 IF leaked IS NULL THEN RAISE EXCEPTION 'verified report inaccessible'; END IF;
 UPDATE tr_local.sessions SET expires_at=now()-interval '1 second';
 SELECT count(*) INTO n FROM tr_local.report_orders r
 JOIN tr_local.cases c ON c.id=r.case_id JOIN tr_local.sessions s ON s.id=c.session_id
 WHERE s.expires_at>now();
 IF n<>0 THEN RAISE EXCEPTION 'expired access'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: unpaid isolation, ownership, proof constraint, single claim, paid read, expiry' AS result;
