# TashilRadar — Master Implementation Plan v2 (Founder-Approved Phase 1)

Direction locked. This revision folds in the founder decisions and the mandatory architectural refinements. Nothing is simplified: TashilRadar remains an AI Financial Decision Platform / AI Loan & Credit Navigator + Loan Readiness Marketplace, not a listing site, form wizard, dashboard template, or generic chatbot.

Core loop (canonical, referenced everywhere below):
**Intent → Understand → Ask → Reason → Eliminate → Match → Explain → Next Action.**

---

## 0. Locked decisions from Founder

| Area             | Decision                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Currency         | Display **Toman**; store integer **IRR (Rials)**; conversion + Persian numerals only in the presentation layer; never store formatted strings |
| Voice            | Browser-first recognition, graceful typing fallback, identical downstream pipeline, **no raw audio persisted**, no extra voice infrastructure |
| Credit / Payment | Both **mocked**; interfaces + journey states designed for later real providers; never imply a real inquiry occurred                           |
| Catalog          | **Neutral/demo partner identities** with seeded realistic Persian product data; no fabricated products under real bank names                  |
| Identity         | Phone + OTP is the future primary identity; email optional and outside the Phase 1 journey; **No-Login First preserved**                      |
| Handoff          | Provider-agnostic; Phase 1 = mocked in-app queue/state; no coupling to any single channel                                                     |

---

## 1. Product architecture

```text
Experience layer   Routes, Radar canvas, Concierge UI, reveal sequences
Reasoning layer    Deterministic engine: readiness, elimination, match, next action
Understanding      LLM: extraction + explanation phrasing only
Integration layer  CreditProvider, PaymentProvider, CatalogProvider,
                   SmsProvider, HandoffProvider, AiProvider (mocked in Phase 1)
```

Hard boundaries: Experience never calls a provider directly; Reasoning never calls an LLM; Understanding never decides eligibility.

**B. Reasoning authority (refined).** The engine is written once as a pure, isomorphic module in `src/core`. It runs client-side for instant feedback, previews and Radar visualization. Every authoritative outcome — eligibility, credit result, any transaction, any partner handoff — is re-evaluated by the _same_ module inside a server function and the server's verdict wins. Each result carries `computedBy: "client-preview" | "server-authoritative"`; UI marks preview state explicitly and never presents a preview as a final decision.

## 2. Information architecture

`/` intent entry · `/concierge` · `/radar` · `/credit` · `/profile` · `/opportunities` + `/opportunities/$id` · `/handoff/$id` · `/partners`. Admin/command center deferred. Every route ships its own Persian `head()` metadata. Document is `dir="rtl"`, `lang="fa"`.

## 3. Master user journey

Intent (typed or spoken) → slot extraction → adaptive questions (max 2–5) → readiness evaluation → reasoning run (Scan/Detect/Connect/Resolve) → eliminated / near / primary → explanation with provenance → next actions → profile enrichment → return-visit personalization.

## 4. State model: No-Login → Known User

```text
ANONYMOUS  -> anon_session_id, local profile only
ENGAGED    -> >=1 intent captured, slots partially filled
IDENTIFIED -> phone verified via OTP (mocked in Phase 1)
CLAIMED    -> anonymous profile merged into the account
```

**A. Anonymous identity (refined).** `anon_session_id` remains the continuity key for the no-login experience, but it is explicitly **not an authorization credential**. It is treated as an untrusted client hint. When persistence and auth are enabled, the server binds a session to a signed, server-issued token, and every read/write is authorized server-side (RLS + ownership checks). Claim/merge is a server-executed operation that verifies the claim before transferring ownership; the client can never assert ownership of another session by presenting a UUID. Phase 1 keeps profile data client-side, so no cross-user exposure surface exists yet, and the interfaces are already shaped for the server-enforced model.

## 5. Experience map

- **Home:** full-viewport intent surface — «دنبال چه چیزی هستی؟», five quick intents, free-text field, voice button of equal weight. Typing transforms the surface into the Concierge **in place**; no hero→cards→CTA structure, no navigation jump.
- **Concierge:** conversation stream, inline adaptive question cards, live slot chips showing exactly what was understood, each chip tagged with its provenance.
- **Radar:** reasoning canvas with node types (bank/product, opportunity, match, missing requirement, supply, next action) and the live tally «۱۱ مسیر بررسی شد / ۴ مسیر حذف شد / ۳ مسیر نزدیک / ۱ پیشنهاد اصلی».
- **Credit:** request → payment placeholder → analysis → staged reveal → explanation → actions, with persistent, unambiguous demo-data labelling.
- **Opportunity:** amount in Toman, product, fit score, freshness, demand level, full reason trace and blockers.

## 6. Component architecture

```text
src/features/  intent/ concierge/ radar/ credit/ profile/ opportunity/ handoff/
src/core/      engine, question catalog, scoring, provenance, types  (pure, no React)
src/lib/       providers (interfaces + mocks), money, format, analytics, state
```

`src/core` is isomorphic and unit-tested with fixtures so client and server share one truth.

## 7. AI Concierge architecture

**C. AI boundary (locked).** LLM = understanding + extraction + explanation. Deterministic engine = readiness, elimination, matching, next actions. Provider/database data = facts. The LLM may never invent products, rates, approval probability, availability, scarcity or eligibility.

- Streaming server route (`src/routes/api/chat.ts`) via AI SDK + Lovable AI Gateway; key stays server-side.
- Extraction produces typed `IntentSlots`: amount (IRR), purpose, employment, business ownership, collateral, guarantor, income band, existing debt, urgency, region.
- Tools: `record_slots` (writes understanding) and `run_reasoning` (invokes the engine and returns its trace for narration only).
- Every number rendered in the UI comes from the engine or provider data, never from model prose. Model output is treated as untrusted text and is not parsed for figures.
- Voice and typing converge on the identical `IntentSlots` pipeline; transcripts become text intents and raw audio is never stored.

## 8. Readiness / Match / Opportunity boundaries

- **Readiness:** per-dimension scores (identity, income stability, collateral, guarantor, credit signal, debt load) → 0–100 with named Persian blockers.
- **Elimination:** hard rules per product; each elimination emits a human-readable Persian reason and the rule ID that fired.
- **Match:** weighted fit over surviving products → `fitScore`, `nearMissGap[]`, `nextActions[]`.
- All pure functions with fixtures and tests; server re-runs them for anything authoritative.

## 9. Explainability & provenance

**D. Refined requirement.** Every fact in the system carries a provenance record:

```ts
type Provenance = {
  source: "user_stated" | "user_confirmed" | "provider_verified" | "catalog" | "derived";
  confidence: number;
  asOf: string; // ISO timestamp
  demo?: true; // set on every mocked provider fact in Phase 1
};
```

Every recommendation and elimination keeps a machine-generated reason trace, and the explanation UI answers, in Persian: why this matched · what blocked other paths · which facts came from the user · which came from verified/provider data · freshness where applicable. Facts flagged `demo` render with a visible demo marker — mock data can never masquerade as verified data.

## 10. Data model (schema designed now; tables created when persistence is enabled)

`profiles`, `intents`, `reasoning_runs`, `products`, `partners`, `matches`, `credit_requests`, `credit_raw` (service-role only), `handoffs`, `market_signals` (anonymized bands only), `events`. All monetary columns are integer IRR. Every public-schema table ships explicit GRANTs and owner-scoped RLS. No raw credit payload is ever readable by the anon role or sent to the browser.

## 11. Backend & API boundaries

App-internal logic via `createServerFn`; streaming chat via a server route; providers behind interfaces (`CreditProvider`, `PaymentProvider`, `ProductCatalogProvider`, `SmsProvider`, `HandoffProvider`, `AiProvider`) with `Mock*` implementations exhibiting realistic latency, failure and empty-result states. Swapping to production is a factory change, not a UI change.

## 12. Security & privacy

No sensitive data in URLs, logs, or public tables. Credit payloads stay server-side. Market signals are anonymized amount bands only. OTP rate limiting designed in. Roles in a separate table with a security-definer helper when auth lands; never a client-side role check. Explicit Persian consent copy before any credit inquiry, plus an explicit statement that Phase 1 performs no real inquiry.

## 13. Analytics / event contract (E)

Phase 1 defines and emits a typed contract; outcome learning stays deferred.
`intent_started · intent_parsed · question_asked · slot_updated · reasoning_started · product_eliminated · match_generated · recommendation_viewed · credit_started · handoff_requested · return_session`
Payload rules: IDs, enums, coarse bands and durations only. No raw utterances, no exact amounts, no phone numbers, no free text. A single `track()` boundary keeps the schema enforceable and the sink swappable.

## 14. Mock integrity (F)

Mocked data is realistic enough to exercise the full experience and is always identifiable as demo: neutral partner identities, seeded Persian product data, `demo: true` provenance, and persistent UI labelling on credit results, market signals and offers. No copy anywhere implies live market, bank, bureau or approval data. No guarantees, no countdowns, no fabricated scarcity.

## 15. Visual system

Deep Midnight Navy · Ice White · Electric Teal (intelligence/action) · Signal Blue (data) · Champagne Gold reserved strictly for money, opportunity and premium signal — never decorative. oklch semantic tokens in `src/styles.css`; no hardcoded colour utilities. Persian typeface loaded via a root `<link>`. Generous space, subtle depth, large emotionally weighted numerals: **۳۰۰٬۰۰۰٬۰۰۰ تومان**, ۸۲٪ تطابق, ۲ فرصت فعال, ۱۲ دقیقه پیش. RTL via logical properties throughout.

## 16. Motion system + Radar integrity (H)

Motion grammar Scan → Detect → Connect → Resolve, as four shared timing/easing presets bound to real state transitions in the reasoning trace. **No fabricated scan activity, ever** — node counts, eliminations, matches, blockers and next actions are rendered directly from engine state; if the engine evaluates 11 paths, the Radar shows 11. Content is fully readable without motion; `prefers-reduced-motion` collapses to instant states.

## 17. Mobile-first / Iran-first UX (J)

Viewport-filling intent surface, keyboard-aware composer, thumb-reachable voice control, one adaptive question per screen, Radar as a vertical reasoning timeline on mobile and full canvas ≥lg, two-panel desktop (conversation + live radar). Complete Persian RTL and numerals, Toman display, low-friction no-login entry, and infrastructure choices appropriate to the Iranian market (no hard dependency on services unreachable from Iran; provider interfaces keep substitution cheap).

## 18. Performance

Route-level code splitting, lazily loaded Radar engine, non-blocking fonts, streamed AI responses, instant client preview reasoning with server confirmation, off-screen animation pause.

## 19. Phased build sequence

1. Foundation — RTL shell, tokens, typography, money/format layer, state store, provider interfaces, analytics contract.
2. Intent entry home with in-place transformation.
3. `src/core` engine with fixtures and tests.
4. Concierge — streaming AI, slot extraction, adaptive questions, provenance capture.
5. Radar bound to the real trace.
6. Opportunity + explanation experience.
7. Credit journey with reveal sequence (mock provider + payment placeholder).
8. Profile, personalization, market radar.
9. Handoff queue, partner network, QA polish.

## 20. Mock first vs build real (I — scope control)

**Real now:** deterministic engine, question catalog, slot model, provenance system, Radar rendering, all UI/motion, money formatting, state machine, analytics contract, AI concierge via Lovable AI, server re-evaluation path.
**Mocked now:** credit bureau, payment, product catalog, SMS/OTP, market feed, handoff queue.
**Deferred:** auth, database persistence, admin command center, ML/outcome learning, live banking integrations.

## 21. Phase 1 acceptance criteria

Original criteria remain active, plus:

- «حدود ۳۰۰ میلیون وام می‌خوام، مغازه دارم، ضامن ندارم» extracts amount, intent, business status and guarantor status, then asks at most two further questions.
- Interface transforms in place; no form-based navigation.
- Radar tally matches the engine trace exactly; no synthetic activity.
- Every recommendation and elimination shows why, what blocked it, fact provenance, and freshness.
- Amounts display in Toman; all stored values are integer IRR; no formatted monetary strings persisted.
- Voice and typed input produce identical `IntentSlots`; no audio retained.
- Credit journey completes on mock data and is unmistakably labelled as demo.
- No real bank names on fabricated products.
- All eleven analytics events fire with schema-valid, non-sensitive payloads.
- Authoritative outcomes are server-confirmed; preview results are visibly marked as previews.
- Fully usable with motion disabled and under reduced-motion.
- Complete RTL, Persian numerals, no English leakage in user-facing copy.
- Returning visitor sees personalized state without logging in.

---

## 22. Remaining true blockers requiring Founder approval

Only two items genuinely block Phase 1; everything else is resolved.

1. **Server authority without persistence.** Refinement B requires server-authoritative re-evaluation, but Phase 1 defers the database. Confirm the intended Phase 1 shape: (a) stateless server functions that re-run the engine on a client-submitted, validated snapshot — no storage, full authority path exercised; or (b) accept client-only reasoning in Phase 1 and add the server path with persistence. Recommendation: **(a)** — it proves the boundary now at low cost.
2. **Demo labelling prominence.** Mock integrity requires visible demo marking, which slightly softens the premium reveal. Confirm the level: (a) persistent visible badge on every provider-derived figure; (b) one prominent session-level banner plus subtle per-fact markers. Recommendation: **(b)** — honest and unmistakable without degrading the experience.

Non-blocking, decidable during build: exact Persian typeface, Radar node-count cap on mobile, and the number of demo partners in the seeded catalog.

Awaiting approval before implementation.
