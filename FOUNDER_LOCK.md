# TashilRadar — Founder Lock

This file records product direction that implementation agents must preserve unless the Founder explicitly changes it.

## North Star

TashilRadar is not a loan-listing website and must not be reduced to a cash-loan comparator.

TashilRadar is a Persian-first **Financial Access + Commerce Intelligence + Execution OS**.

A user starts with a real-world need. The system should understand the user's situation, discover realistic routes, explain gaps, help make missing requirements actionable where legally possible, and guide or automate execution until the route completes or requires a human expert.

Core flow:

`Need -> Capabilities/Constraints -> Opportunity Routes -> Decision -> Next Action -> Execution -> Outcome`

AI may orchestrate and explain this flow, but deterministic domain cores remain authoritative for financial truth.

## Four product worlds

1. **Money** — cash needs, loans, facilities, credit lines and liquidity access.
2. **Buy** — installment purchase, BNPL, leasing, credit purchase, goods and services.
3. **Business** — working capital, equipment, business credit and SME financing.
4. **Trade** — sourcing, import/export opportunities and trade finance. Direct inventory/import/export execution stays dependent on validated demand, economics, partners and required permissions.

Users should not be forced to understand these worlds. Natural-language intent should route them to the correct journey.

## Buy / Credit Commerce

Buy is a first-class product world, not a side feature.

The long-term route can combine:

`User Need -> Affordability -> Requirements -> Credit Provider -> Credit Plan -> Merchant/Supplier -> Product/Service -> Quote/Terms -> Route Value -> Execution`

The architecture must not assume an online retail SKU only. It must support high-ticket purchases and supplier-led commerce.

### Vehicle is an official Buy vertical

Vehicle installment purchase / vehicle financing is part of the official product map.

Vehicle must be implemented as a vertical on the common commerce/route foundation, not as a separate incompatible core.

The shared foundation should be able to represent dealer/supplier routes, down payment, financing/leasing plans, required guarantees/documents, price/terms, delivery and execution readiness. Vehicle-specific fields such as model year, mileage, new/used, transfer, insurance and delivery may live in a later Vehicle extension.

Future verticals such as property or other high-ticket goods should be able to follow the same extension pattern without rebuilding the platform.

## Strict core, forgiving execution path

Financial truth stays strict. User paths stay flexible.

`Unknown != negative`

`Missing != impossible`

A missing requirement can remain missing, be obtainable by the user, or be legally completable with assisted execution. TashilRadar should search for alternative routes and lawful ways to close gaps instead of treating every missing item as rejection.

Do not fabricate documents, misrepresent eligibility, bypass KYC/compliance, or create false financial facts.

The product may offer discreet assisted execution through qualified partners/experts when a requirement or process can legally be completed. UX should describe this as help completing the route, not as selling or manufacturing documents.

## Tashil Brain

OpenAI/AI belongs in orchestration, not authoritative financial judgment.

AI responsibilities may include:
- natural-language intent understanding
- adaptive questioning
- planning/tool selection
- summarizing deterministic results
- choosing the next workflow step
- preparing human-expert case briefs

Deterministic cores own eligibility, match/readiness truth, quote validity, route economics and other auditable financial decisions.

## Platform readiness

TashilRadar should be built as a launch-ready platform that can be shown to banks, lenders, BNPL providers, merchants, suppliers and other partners as an integration-ready system.

External dependencies must not be faked. A capability can exist visibly before its external dependency is available, with an honest status such as:

- `ACTIVE`
- `COMING_SOON`
- `PARTNER_REQUIRED`
- `LICENSE_REQUIRED`

A Coming Soon or Partner/License Required area should still be useful where appropriate, for example by capturing structured demand, rather than being a dead placeholder.

Do not hard-code SnappPay, DigiPay, AzkiVam, a bank, merchant or supplier API into domain cores before official B2B contracts/docs exist. Build explicit partner/adaptor boundaries first.

## Commercial model

Potential revenue layers include:
- paid personalized Decision / Action Plan
- assisted execution fees
- qualified lead revenue
- referral / transaction commission
- premium Business / Trade services
- later B2B demand/outcome intelligence

Commercial compensation must not corrupt user ranking. Best-route ranking remains user-outcome driven. Sponsored/commercial placement, if introduced, must be separate and explicit.

## Data moat

The strategic data asset is Outcome Intelligence, not a static catalog.

Over time the platform should learn from privacy-safe structured outcomes such as:

`Need + Profile/Capabilities + Routes considered + Requirements/Gaps + Provider/Merchant outcome + Quote/Final Cost + Execution Time + Failure/Success reason`

Demand Intelligence should later inform procurement, import/export and new business opportunities.

## Product visibility

The public product should make the breadth of the platform understandable from the beginning. Money, Buy, Business and Trade may have different operational maturity, but future capabilities should be represented truthfully so users and partners can see what exists, what is opening next and what requires an external partner or permission.

## Build discipline

Do not rebuild approved cores for convenience.

Current approved foundations include Eligibility/Match, Lead Liquidity, Execution Readiness, Quote Intelligence and Quote Decision.

New work should extend around them unless a genuine P0 defect exists.

Every meaningful feature should improve at least one of:
- Decision Quality
- Execution Rate
- Data Moat
- Trust
- Revenue Quality

Architecture must leave room to scale, but must not become ceremony-heavy or over-engineered. Build complete, coherent platform capabilities with clear extension boundaries rather than one-off features or speculative enterprise infrastructure.
