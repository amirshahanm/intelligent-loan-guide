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

AI/LLM may:
- understand natural-language intent
- normalize structured input
- orchestrate tools/workflows
- explain deterministic results
- produce human handoff briefs

AI/LLM must not authoritatively invent or override:
- eligibility
- rates or prices
- quote validity
- final cost arithmetic
- route execution state
- KYC/compliance facts
- approval/guarantee claims

Approved deterministic cores must stay authoritative unless a genuine P0 defect is proven.

## 3. Production backend

Supabase project: `TashilRadar-Production`
Region: `eu-central-1`
Project URL: `https://logsusogxmuprewlxrvf.supabase.co`

Sensitive backend access must remain server-side.

Required production environment variables:
- `TASHILRADAR_DEPLOYMENT_MODE=production`
- `TASHILRADAR_SUPABASE_URL=https://logsusogxmuprewlxrvf.supabase.co`
- `TASHILRADAR_SUPABASE_SERVICE_ROLE_KEY=<server secret only>`
- `TASHILRADAR_REQUEST_FINGERPRINT_SECRET=<high-entropy server secret>`

Never commit server secrets to Git, expose them through `VITE_*`, send them to the browser, or place them in client-visible logs.

## 4. No-Login First security

Anonymous product entry stays available without login.

Persisted anonymous sessions require:
- backend `sessionId`
- separate random capability token
- only the SHA-256 capability hash stored in Postgres
- capability expiry/rotation support
- client capability kept out of persistent localStorage

A bare session UUID is not an authorization credential.

If a tab-scoped anonymous capability is gone, preserve the local user profile but create a fresh backend session at the next persistence gate.

## 5. Request abuse protection

Server functions are protected by TanStack Start CSRF middleware.

Authoritative decision persistence additionally uses a database-backed rate-limit RPC with privacy-safe HMAC request fingerprints. Raw IP addresses and user-agent strings are not stored in the rate-limit table.

Application rate limiting is defense in depth. Production edge/CDN rate limiting remains recommended and must not trust spoofable forwarding headers unless the deployment proxy normalizes them.

## 6. Mock safety

Current mock provider classes may exist for development/demo.

Production must fail closed if mock implementations remain wired for:
- credit
- payment
- SMS/OTP
- handoff
- other authoritative financial providers

Demo facts/routes must stay visibly marked and must not masquerade as live/verified partner data.

## 7. Provenance

Financial facts require provenance:
- source
- confidence
- as-of/freshness
- demo status where applicable

Deterministic text parsing must be labeled `deterministic_text`, not AI.
AI-derived structure, once introduced, must be separately labeled and validated before deterministic cores consume it.

## 8. Universal Route foundation

Supported product worlds:
- Money
- Buy
- Business
- Trade

Vehicle is an official Buy vertical.

Raw Persian need text may select the broader route family without changing the legacy loan-purpose model. Legacy Eligibility/Match remains intact behind an adapter boundary.

## 9. Route Value

`route_value_score` is deterministic and auditable.

Current phase: `prequote`.
Inputs currently include:
- route fit
- execution readiness/capability status
- evidence strength

Prequote Route Value must not imply final price economics. Verified quote cost/rate/value enters only after authoritative Quote Intelligence/Quote Decision evidence exists.

## 10. Persistence and auditability

Authoritative decisions persist:
- engine version
- ruleset version
- canonical input snapshot + SHA-256 hash
- semantic output snapshot + SHA-256 hash
- route options and route-value breakdown
- world/vertical
- audit events

Equivalent retries may reuse the same substantive decision fingerprint.

## 11. Database security

Before release:
- Supabase Security Advisor must have no unresolved security warnings.
- RLS must stay enabled on sensitive `tr_*` tables.
- audit/session-capability/rate-limit internals must not become client-readable.
- service-role-only RPC privileges must remain service-role-only.

Do not weaken RLS for convenience.

## 12. Quality gate

The production branch must pass all automated checks configured in:
`.github/workflows/production-quality-gate.yml`

Expected gates include:
- Liquidity
- Quote Intelligence
- Quote Decision
- Provenance
- Universal Route
- Persian universal-need understanding
- Route Value
- Authoritative Decision Envelope
- Decision Persistence fingerprint
- Provider Safety
- lint
- production build

A green visual preview is not a substitute for these checks.

## 13. Current external dependencies still required before real financial execution

These must be integrated only with real credentials/contracts/documentation:
- production SMS/OTP provider
- payment gateway
- credit/credit-bureau provider
- bank/lender/BNPL/leasing adapters
- merchant/supplier/dealer partner adapters

Capability states such as `PARTNER_REQUIRED`, `COMING_SOON` and `LICENSE_REQUIRED` must remain truthful until those dependencies exist.

## 14. Main branch rule

Do not merge `production/regulator-grade-v1` into `main` until:
1. automated quality gate is confirmed green on the release candidate
2. production secrets are injected only server-side
3. full mobile/desktop UX QA is completed
4. persistence/auth/OTP/provider behavior is tested in the intended deployment environment
5. security review is repeated after final DDL/provider changes
6. Founder visual/product QA is approved
7. final Work Sol Ultra red-team/audit pass is completed if requested

No force-push, history rewrite, rebase/amend/squash of published Lovable-connected history.
