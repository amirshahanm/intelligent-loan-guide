# Architecture

## Goal

Keep the user experience modular while making a hard distinction between product reasoning, presentation, and external financial data.

## Layers

### Experience layer

Routes and components render the Persian-first, RTL-first journey. User-facing views should explain why information is requested and why an option is shown.

### Domain layer

Financial context, readiness, opportunity, quote, handoff, and provenance concepts should be represented as explicit domain objects rather than implicit UI state.

### Decision boundary

Recommendation logic should consume normalized inputs and return explainable outputs. Missing or unknown data should stay explicit rather than being silently converted into a positive outcome.

### Provider boundary

Banks, lenders, credit bureaus, payment services, identity providers, and AI services belong behind adapters. Mocked adapters must remain clearly distinguishable from verified production integrations.

### Audit and provenance boundary

Important outputs should be traceable to source, freshness, transformation, and relevant user consent in production deployments.

## Non-goals

The open-source repository does not provide a universal credit score, guarantee approval, certify a provider, or replace legal or compliance review.

## Design constraint

A degraded or unavailable provider or AI integration must not cause the interface to invent availability or eligibility. Unknown should remain unknown.
