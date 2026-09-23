# Intelligent Loan Guide / TashilRadar

Open-source reference implementation for a Persian-first, AI-assisted loan and credit discovery experience.

The project explores conversational intake, adaptive follow-up questions, readiness states, explainable opportunity presentation, provenance, and human handoff in a mobile-first RTL interface.

## Status

Active early-stage open source. The repository contains a working TypeScript/TanStack application. External banking, credit, payment, identity, and AI integrations are separate boundaries and are not assumed to be available by default.

## Principles

- Persian-first and RTL-first
- mobile-first
- no-login-first exploration
- natural-language entry with adaptive questions
- explainable outputs
- explicit mocked-vs-real provider boundaries
- privacy-aware public views
- graceful degradation when integrations are unavailable

## Current implementation

The repository includes routes and UI foundations for home/intent entry, credit, profile and readiness states, opportunity discovery, opportunity detail, radar, partners, and human handoff. See `src/routes` and `src/features`.

## Stack

TypeScript, React 19, TanStack Start/Router/Query, Vite, Tailwind CSS, Radix UI primitives, and Zod.

## Quick start

```bash
git clone https://github.com/amirshahanm/intelligent-loan-guide.git
cd intelligent-loan-guide
bun install
bun run dev
```

Quality checks:

```bash
bun run lint
bun run build
```

## Architecture

The project separates experience, domain logic, decision boundaries, provider adapters, and provenance. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Open-source maintenance

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [ROADMAP.md](ROADMAP.md).

Primary maintainer: [@amirshahanm](https://github.com/amirshahanm)

## License

[MIT](LICENSE)

## Important note

This repository is a software reference implementation. Real-world deployments are responsible for validating external data sources, user consent, security, privacy, and applicable regulatory requirements.
