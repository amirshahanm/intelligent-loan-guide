BEGIN;
CREATE SCHEMA IF NOT EXISTS tr_local;
CREATE TABLE IF NOT EXISTS tr_local.sessions (
 id uuid PRIMARY KEY, capability_hash text NOT NULL CHECK(length(capability_hash)=64),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tr_local.cases (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES tr_local.sessions(id),
 active_run_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tr_local.decision_runs (
 id uuid PRIMARY KEY, case_id uuid NOT NULL REFERENCES tr_local.cases(id),
 input_hash text NOT NULL, output_hash text NOT NULL,
 input_snapshot jsonb NOT NULL, output_snapshot jsonb NOT NULL,
 routes jsonb NOT NULL, world text NOT NULL, vertical text NOT NULL,
 engine_version text NOT NULL, ruleset_version text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(case_id,input_hash,output_hash,engine_version,ruleset_version)
);
CREATE TABLE IF NOT EXISTS tr_local.rate_windows (
 key_hash text NOT NULL, scope text NOT NULL, window_start bigint NOT NULL,
 count integer NOT NULL, expires_at timestamptz NOT NULL,
 PRIMARY KEY(key_hash,scope,window_start)
);
REVOKE ALL ON SCHEMA tr_local FROM PUBLIC;
GRANT USAGE ON SCHEMA tr_local TO tashilradar_app;
GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA tr_local TO tashilradar_app;
COMMIT;
