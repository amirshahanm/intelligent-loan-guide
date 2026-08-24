# TashilRadar

TashilRadar is a Persian-first **Financial Access + Commerce Intelligence + Execution OS**.

Implementation is active. This repository is no longer in planning-only mode.

## Product North Star

A user starts with a real need in natural language. TashilRadar understands the situation, asks only necessary questions, discovers realistic routes, explains why routes fit or fail, and guides the user toward the next executable action.

Canonical flow:

`Need → Capabilities / Constraints → Opportunity Routes → Deterministic Decision → Next Action → Execution → Outcome`

The public product must feel like a living financial intelligence interface, not a loan-listing website, generic fintech landing page, bank website, crypto dashboard or conventional form flow.

## Four Product Worlds

- **Money** — loans, facilities, liquidity and credit lines.
- **Buy** — installment purchase, BNPL, leasing and credit commerce.
- **Business** — working capital, equipment finance and SME access.
- **Trade** — trade opportunity intelligence and trade finance with explicit partner/license boundaries.

Vehicle finance is an official Buy vertical and extends the shared route foundation.

## Core Authority Model

AI may understand intent, orchestrate tools, choose adaptive questions and explain results.

AI must not silently override financial truth.

Deterministic typed cores remain authoritative for:

- eligibility and match
- readiness and liquidity
- quote validity and quote decision
- route ordering inputs
- auditable financial calculations

Server-authoritative decisions are persisted with versioned input/output snapshots and hashes.

## No-Login First

Anonymous users can begin without authentication. Persisted anonymous sessions are server-controlled and require a separate short-lived capability token; a bare session UUID is never an authorization credential. Sensitive writes remain server-side.

Identity/OTP is introduced only at a genuine value or action gate. Anonymous history can later be claimed by a verified user without restarting discovery.

## Trust Boundaries

- No fake guarantees, scarcity, live data, approvals or partner claims.
- Demo facts and capabilities must be visibly marked.
- Production must fail closed if mock financial/payment/OTP/handoff providers remain configured.
- Every financial fact carries provenance, confidence and freshness.
- Commercial compensation must never silently influence best-route ranking.
- External providers integrate through explicit adapters rather than entering domain cores directly.

## Backend

Production backend: Supabase/Postgres in `eu-central-1`.

The Financial OS schema includes:

- `tr_sessions`
- `tr_cases`
- `tr_financial_profiles`
- `tr_financial_facts`
- `tr_decision_runs`
- `tr_route_options`
- `tr_quote_observations`
- `tr_execution_cases`
- `tr_execution_events`
- `tr_outcomes`
- `tr_consent_events`
- `tr_audit_events`
- `tr_partners`
- `tr_session_capabilities`

RLS is enabled across sensitive public tables. Audit and session-capability data are not client-readable.

## Current Stack

- TanStack Start
- React 19
- TypeScript
- Vite
- Tailwind CSS
- deterministic domain cores in `src/core`
- server functions for authoritative decisions
- Supabase/Postgres for persistence and auditability

Do not migrate frameworks or rebuild approved cores without a genuine P0 reason and Founder approval.

## Branch Discipline

- `main` remains the release baseline until the regulator-grade line passes final QA.
- `production/regulator-grade-v1` is the active production-hardening line.
- `visual-motion` is a Lovable/preview line and must never overwrite production history.
- Never force-push, rebase, amend or squash already-published Lovable-connected history.

## Quality Gate

Production work is expected to pass:

- Liquidity core self-check
- Quote Intelligence self-check
- Quote Decision self-check
- Provenance truth-boundary self-check
- Universal Route self-check
- Provider Safety self-check
- lint
- production build

## Founder Direction

`FOUNDER_LOCK.md` is the canonical product-direction file and overrides stale historical planning language anywhere else in repository history.

Meaningful features must improve at least one of:

- Decision Quality
- Execution Rate
- Data Moat
- Trust
- Revenue Quality

Build a category-defining financial access and execution platform, not a prettier loan directory.
