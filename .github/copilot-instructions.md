# Repository instructions for GitHub-connected coding assistants

Before planning or editing, read `AGENTS.md`, `FOUNDER_LOCK.md`, `PRODUCTION_READINESS.md`, and `AI_HANDOFF.md`. The first three are authoritative; the handoff summarizes navigation and current evidence.

- Preserve the Founder-approved product direction and deterministic financial cores.
- Never invent eligibility, pricing/rates, quotes, provider availability, approvals, guarantees, compliance facts, or execution status.
- Never expose or commit secrets. Keep provider credentials server-side and do not ask the user to paste keys, passwords, or OTPs into chat.
- Inspect branch, working tree, remote state, CI, and related pull requests before edits. Preserve existing user work.
- This repository is connected to Lovable; do not force-push or rewrite published history.
- `production/regulator-grade-v1` is an active build line, not release-approved. Do not merge it into `main` or deploy it unless every gate in `PRODUCTION_READINESS.md` is met and the required approval is explicit.
- Keep changes scoped, run relevant checks, and distinguish code implementation from verified live integrations, merge, and deployment.
