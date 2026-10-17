# Independent server backend — 2026-10-09

Owner approved using the existing Germany server instead of adding Runflare.
This is an additive, opt-in PostgreSQL adapter, not a migration of the unavailable
hosted Supabase project or a rebuild of the deterministic decision cores.

Scope: anonymous decision/case persistence and atomic request rate limits.
Existing Supabase code remains intact and is selected unless
`TASHILRADAR_BACKEND=postgres`. Verified-phone identity, consent, handoff,
OTP, provider billing and payments are NOT implemented by this schema.
Their previous paths fail closed without configured backend/provider access.
Do not sell a credit score, availability, eligibility or Sakha service on this basis.

Runtime: independent `tashilradar-postgres` container, pinned existing official
PostgreSQL 16 image, 384 MiB limit, internal-only `tashilradar_data` network,
separate `tashilradar_pgdata` volume. No published database port. The app gets a
non-superuser account restricted to this schema; the admin credential is not
injected into the app. Capability hashes and 14-day expiry are stored atomically
with the first case. No raw capability or raw need-text column is persisted.
Snapshots still contain user-stated financial facts; treat them as sensitive.

Build MUST use both `TASHILRADAR_RUNTIME_TARGET=node` and
`VITE_TASHILRADAR_DEPLOYMENT_MODE=production`. Runtime configuration alone does
not disable the client demo catalog. Provider secrets are never build inputs.

Protected host config: `/opt/tashilradar/secrets/backend.env` (root 0600).
Provision with `provision.sh`, then apply `001-decisions.sql` as the database
admin. Test via bundled `check.ts` in a disposable Node container on the private
network. Test writes synthetic sessions; do not mistake them for real users.

Backup script encrypts and verifies a full dump; keep an off-host encrypted copy
and the recovery key in separate protected storage. Same-host backup alone is
not disaster recovery. No automatic retention deletion is configured yet.

Rollback: switch Caddy to the retained preceding app container and reload its
validated config. Keep the PostgreSQL volume and protected credentials intact.
No other project's database, Docker services or Iran VPN are modified.
