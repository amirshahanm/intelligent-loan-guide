# TashilRadar Production Readiness Contract

Status: ACTIVE BUILD — NOT YET RELEASE-APPROVED

This document is the operational release contract for `production/regulator-grade-v1`.
`FOUNDER_LOCK.md` remains the product-direction authority.

## 1. Release invariant

TashilRadar is a Financial Access + Commerce Intelligence + Execution OS.
A release must not reduce the product to a loan catalog, generic fintech landing page or AI chat wrapper.

Core flow:

`Need → Capabilities / Constraints → Opportunity Routes → Deterministic Decision → Next Action → Execution → Outcome`

## 2. Financial truth boundary

AI/LLM may understand natural-language intent, normalize structured input, orchestrate tools/workflows, explain deterministic results and produce human handoff briefs.

AI/LLM must not authoritatively invent or override eligibility, rates/prices, quote validity, final-cost arithmetic, route execution state, KYC/compliance facts or approval/guarantee claims.

Approved deterministic cores stay authoritative unless a genuine P0 defect is proven.

## 3. Production backend

Supabase project: `TashilRadar-Production`
Region: `eu-central-1`
Project URL: `https://logsusogxmuprewlxrvf.supabase.co`

Required production environment variables:
- `TASHILRADAR_DEPLOYMENT_MODE=production`
- `VITE_TASHILRADAR_DEPLOYMENT_MODE=production` (public capability/UX mode only; never a secret)
- `TASHILRADAR_SUPABASE_URL=https://logsusogxmuprewlxrvf.supabase.co`
- `TASHILRADAR_SUPABASE_SERVICE_ROLE_KEY=<server secret only>`
- `TASHILRADAR_REQUEST_FINGERPRINT_SECRET=<high-entropy server secret>`
- `TASHILRADAR_OTP_PEPPER=<independent high-entropy server secret>`

Never commit server secrets to Git, expose them through `VITE_*`, send them to the browser or place them in client-visible logs.

## 4. No-Login First security

Anonymous product entry stays available without login.

Persisted anonymous sessions require backend `sessionId` plus a separate random capability token. Only the SHA-256 capability hash is stored in Postgres. The raw capability remains tab/session-scoped and is not persisted in localStorage.

A bare session UUID is not an authorization credential. If a tab-scoped capability is lost, preserve the local profile but create a fresh secure backend session at the next persistence gate.

## 5. OTP security

OTP is server-owned.

- SMS adapters are transport only.
- Raw OTP codes are never stored in Postgres.
- Raw phone numbers are not stored in the OTP challenge table.
- Phone/code challenge values are protected with a server-only HMAC pepper.
- Challenges expire, have bounded attempts and are one-time use.
- Replay of a consumed challenge must fail.
- OTP send and verify endpoints use database-backed rate limiting.
- Demo OTP codes may be returned only with a mock SMS adapter outside production.

## 6. Request abuse protection

Server functions are protected by TanStack Start CSRF middleware.

Decision persistence, OTP, credit execution and handoff execution use the database-backed rate-limit RPC with privacy-safe HMAC request fingerprints. Raw IP addresses and user-agent strings are not stored in the rate-limit table.

Application rate limiting is defense in depth. Production edge/CDN rate limiting remains recommended.

## 7. Provider safety and graceful degradation

Mocks may exist only in demo/staging and must stay visibly identified.

Production must never silently fall back to mock credit, payment, SMS, catalog or handoff execution.

If a real external provider is not yet configured, use an explicit `unavailable` adapter. The public product may remain online, but that capability must be disabled/truthfully labeled in UI rather than simulated or causing the whole product to crash.

A production capability may become `active` only after a real adapter, credentials/contracts and QA are complete.

## 8. Credit consent

Credit execution requires an explicit case-bound consent event.

Consent records include scope, grant/revoke action, policy version, evidence and timestamp in `tr_consent_events`. Consent writes verify the anonymous session capability and case/session relationship before insertion.

## 9. Secure handoff

Human handoff is server-owned and case-bound.

`tr_handoffs_v2` requires a valid session capability and matching `case_id`. A handoff id by itself grants no read access. Demo/staging can exercise the internal queue; production must not create a fake live queue when no real execution partner is configured.

## 10. Provenance

Financial facts require source, confidence, as-of/freshness and demo status where applicable.

Deterministic text parsing is labeled `deterministic_text`, not AI. AI-derived structure, once introduced, must be separately labeled and validated before deterministic cores consume it.

## 11. Universal Route foundation

Supported product worlds: Money, Buy, Business and Trade. Vehicle is an official Buy vertical.

Raw Persian need text may select the broader route family without changing the legacy loan-purpose model. Legacy Eligibility/Match remains intact behind an adapter boundary.

## 12. Route Value

`route_value_score` is deterministic and auditable.

Current phase: `prequote`. Inputs currently include route fit, execution readiness/capability status and evidence strength.

Prequote Route Value must not imply final price economics. Verified quote cost/rate/value enters only after authoritative Quote Intelligence/Quote Decision evidence exists.

## 13. Persistence and auditability

Authoritative decisions persist engine/ruleset versions, canonical input/output snapshots and hashes, route options, route-value breakdown, world/vertical and audit events. Equivalent retries may reuse the same substantive decision fingerprint.

## 14. Database security

Before release:
- Supabase Security Advisor must have no unresolved security warnings.
- RLS stays enabled on sensitive `tr_*` tables.
- audit/session-capability/rate-limit/OTP internals stay client-unreadable.
- service-role-only RPC privileges remain service-role-only.
- test transactions must leave no production rows behind.

Do not weaken RLS for convenience.

## 15. Quality gate

The production branch must pass `.github/workflows/production-quality-gate.yml`, including Liquidity, Quote Intelligence, Quote Decision, Provenance, Universal Route, Persian universal-need understanding, Route Value, Authoritative Decision Envelope, Decision Persistence fingerprint, Provider Safety, lint and production build.

A green visual preview is not a substitute for these checks.

## 16. External dependencies still required for real financial execution

Real credentials/contracts/documentation are still required for production SMS delivery, payment gateway, credit/credit-bureau access, lender/BNPL/leasing adapters and merchant/supplier/dealer partners.

Capability states such as `PARTNER_REQUIRED`, `COMING_SOON` and `LICENSE_REQUIRED` remain truthful until those dependencies exist.

## 17. Main branch rule

Do not merge `production/regulator-grade-v1` into `main` until:
1. automated quality gate is confirmed green on the release candidate
2. production secrets are injected only server-side
3. full mobile/desktop UX QA is completed
4. persistence/auth/OTP/provider behavior is tested in the intended deployment environment
5. security review is repeated after final DDL/provider changes
6. Founder visual/product QA is approved
7. final Work Sol Ultra red-team/audit pass is completed if requested

No force-push, history rewrite, rebase/amend/squash of published Lovable-connected history.
