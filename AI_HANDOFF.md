# TashilRadar — AI / Contributor Handoff

Last updated: 2026-10-17

## Start here

This file is a navigation aid, not a replacement for the repository's source of truth. Before making changes, inspect the current branch, working tree, remote status, and open pull requests. Then read:

1. `AGENTS.md`
2. `FOUNDER_LOCK.md`
3. `PRODUCTION_READINESS.md`

The Founder Lock defines product direction. The Production Readiness Contract defines release gates. If this summary conflicts with those files or current code, follow the source files and current evidence, then update this handoff.

## Repository and current work line

- GitHub repository: `amirshahanm/intelligent-loan-guide`
- Active implementation branch: `production/regulator-grade-v1`
- This branch is connected to Lovable. Pushed commits may sync to its editor.
- Do not rewrite published history: no force-push, rebase, amend, or squash of published commits.
- The product is a Persian-first Financial Access + Commerce Intelligence + Execution OS, not a cash-loan-only catalog or generic AI chat wrapper.
- Deterministic financial cores remain authoritative. AI may understand, orchestrate, and explain; it must not invent eligibility, prices, rates, quotes, approvals, provider availability, compliance facts, or execution outcomes.

## What the current implementation work covers

The implementation on this branch extends the locked product rather than replacing it. The current working tree includes work across:

- Home, shared application shell, Radar, opportunities, profile, support, credit, vehicle, goods, trade, and finance journeys.
- Universal need parsing, purchase-budget extraction, money handling, question flows, voice capture, and responsive service presentation.
- Tashil Brain server orchestration, policy and source boundaries, request protection, and query/session handling.
- Server-side provider adapters and explicit integration boundaries for API.ir SMS/matching and Zarinpal report checkout/verification.
- PostgreSQL-backed persistence and report-flow implementation, plus deployment and QA support files.
- Persian-first UI and English-digit presentation requirements, while preserving approved labels, routes, and deterministic financial truth.

These are code changes in the repository; they do not by themselves prove that production credentials, provider contracts, production database migrations, checkout, or external services are active.

## Current verification evidence

The most recent prior implementation verification recorded for this working tree was:

- Production build passed.
- Regular test suite: 58 passed, 1 isolated integration test skipped by default.
- The isolated report-flow integration test was run separately against a disposable local PostgreSQL instance and simulated payment gateway and passed; it did not touch a production database.
- Targeted lint for the changed implementation files passed. A repository-wide profile lint failure was previously identified as pre-existing/out of scope; recheck before relying on that classification.

These results predate the handoff-documentation change. Re-run appropriate checks on the exact current commit before claiming fresh verification. Do not present local tests or build output as production acceptance.

## Not yet release-approved

`PRODUCTION_READINESS.md` is authoritative. At handoff time, the release status is **ACTIVE BUILD — NOT YET RELEASE-APPROVED**. In particular:

- Do not merge this implementation branch to `main` until every listed release gate is satisfied and Founder approval is present.
- Do not claim a live payment, SMS, credit-bureau, lender, BNPL, merchant, or supplier connection until credentials/contracts and real-environment QA prove it.
- Production environment secrets must be installed only in the approved server-side environment; never add them to Git, `VITE_*`, browser code, logs, or this handoff.
- Production database migrations, security review, intended-environment persistence/auth/OTP/provider QA, full mobile/desktop QA, and final Founder product/visual approval remain release gates unless current evidence says otherwise.
- Report checkout/pricing code is not evidence that payments are enabled or received.

## Safe continuation protocol

1. Inspect `git status`, branch, local-vs-remote commits, and relevant PR/CI status. Preserve all user changes.
2. Read the three source-of-truth files above before architecture or release decisions.
3. Make the smallest complete change in scope. Keep credentials server-side and provider integrations explicit/unavailable until real dependencies are validated.
4. Run only the checks relevant to the change, and report exact evidence and limitations.
5. Commit and push only to the authorized working branch. Never merge to `main` or deploy to production unless the release contract is satisfied and explicitly authorized.
6. Update this handoff when materially changing implementation or readiness; distinguish implemented, locally verified, remotely pushed, merged, and deployed states.

## Access note for other AI platforms

This file gives repository-aware coding assistants durable project context. It does not itself connect an AI platform to GitHub or grant it permissions. The repository owner must connect that platform to this repository and choose the intended branch/permission level. Prefer the minimum required access; use a feature branch and pull request for changes, and do not provide secrets through chat or repository files.
