# Intelligent Loan Guide

PROJECT: TashilRadar



MODE: PLANNING ONLY.

Do not build or modify code yet.

Do not simplify the product into a normal fintech landing page.



We are building TashilRadar as an AI-first Loan & Credit Decision Platform for Persian-speaking users.



The product vision and core architecture are already decided. Your job now is to create the strongest implementation plan for this exact product, not reinterpret it from scratch.



CORE PRODUCT:

TashilRadar helps a user explain a financial need in natural language, understands their financial context, asks only necessary adaptive questions, evaluates readiness, searches suitable financial/loan opportunities, explains matches, and guides the user to the next action.



Example:

User says:

«حدود ۳۰۰ میلیون وام می‌خوام، مغازه دارم، ضامن ندارم.»



The system should understand:

- target amount

- financial intent

- employment/business status

- guarantor status



Then respond naturally:

«فهمیدم. فقط دو چیز دیگه لازمه بدونم.»



The experience must feel like a living financial intelligence interface, not a form-based website.



LOCKED PRODUCT PRINCIPLES:

- Persian-first

- Full RTL

- Mobile-first, excellent desktop experience

- No-Login First

- Natural-language AI Concierge

- Typing and Voice as equal entry methods

- Adaptive questions, not long static forms

- Explainable recommendations

- Financial Profile that becomes richer over time

- Human handoff only when necessary

- Fast, trustworthy, premium, highly intelligent UX

- No fake loan guarantees

- No fake scarcity

- No deceptive claims

- No public display of sensitive personal data



CORE MODULES:

1. Interactive Home / Intent Entry

2. AI Financial Concierge

3. Credit & Readiness Journey

4. Financial Profile

5. Match Engine

6. Market Radar

7. Opportunity Engine

8. Offer / Recommendation Experience

9. Deal / Human Handoff

10. Partner Network

11. User history and personalization

12. Internal Command Center later

13. Data / Outcome learning layer later



HOME EXPERIENCE:

Do NOT design the homepage as:

Hero → cards → sections → CTA.



The first 3–5 seconds must clearly communicate:

1. This is about my loan / credit / financial need.

2. The system understands my individual situation.

3. This is fundamentally different from ordinary loan websites.



Primary entry:

«دنبال چه چیزی هستی؟»



Quick intents:

- وام می‌خوام

- رتبه‌ام رو ببینم

- امتیاز دارم

- امتیاز می‌خوام

- یه راه حل برام پیدا کن



Natural-language input:

«یا با زبان خودت بگو چی می‌خوای…»



Voice input should be visible beside typing.



AI should transform the interface in place instead of sending users through conventional forms.



RADAR CONCEPT:

Radar is not decoration.



It represents actual reasoning states:

- Scan

- Detect

- Connect

- Resolve



Possible semantic nodes:

- Bank / Product

- Opportunity

- Match

- Missing Requirement

- Supply

- Next Action



Example analysis:

11 مسیر بررسی شد

4 مسیر حذف شد

3 مسیر نزدیک

1 پیشنهاد اصلی



CREDIT EXPERIENCE:

Credit checking should have a powerful reveal sequence:

Request

→ payment integration later

→ analysis state

→ result reveal

→ explanation

→ recommended actions



The final user experience should answer:

- وضعیت من چیه؟

- چرا؟

- چه چیزی مانع منه؟

- چه کاری می‌تونم انجام بدم؟

- با این شرایط چه گزینه‌هایی دارم؟



Do not expose internal technical terminology such as:

Knowledge Graph

Decision Logic

Outcome Loop

Scenario Studio

Context Engine

to normal users.



Keep those concepts behind the interface.



LIVE MARKET FEEL:

The product should be capable of showing anonymized live opportunities and market signals such as:

- amount

- bank/product

- freshness

- demand level

- fit score

without exposing personal identity.



VISUAL DIRECTION:

This must NOT feel like:

- a generic SaaS template

- ordinary banking website

- crypto dashboard

- cyberpunk interface

- crowded dashboard

- generic AI landing page



Target:

Future Fintech + Financial Intelligence + Premium Trust.



Base visual language:

Deep Midnight Navy

Ice White

Electric Teal = intelligence/action

Signal Blue = data

Champagne Gold = money/opportunity/premium signal only



Gold must have semantic meaning and should not be decorative.



Use strong typography, generous space, meaningful motion, subtle depth, premium micro-interactions and high clarity.



Numbers should have emotional weight:

300,000,000

82% Match

2 فرصت فعال

12 دقیقه پیش



MOTION:

Motion must communicate system intelligence, not decoration.



Brand motion grammar:

Scan → Detect → Connect → Resolve.



PERFORMANCE:

Fast loading is mandatory.

Motion cannot block usability.

Important content must remain visible if motion fails.

Support reduced motion.



ARCHITECTURE:

Build this as a modular web product that can evolve continuously without rebuilding from scratch.



Future integrations will include:

- authentication

- database

- payment

- SMS / OTP

- credit data provider

- external banking/product APIs

- AI models

- admin / operations systems



Do not assume these external APIs already exist.

Use explicit integration boundaries and mocked interfaces until credentials/APIs are available.



TECH DIRECTION:

Use Lovable's current recommended web stack and architecture.

Keep components modular and maintainable.

Prepare clean boundaries for backend, AI and external service integrations.

Do not create irreversible vendor lock-in decisions unnecessarily.



IMPORTANT:

For this planning phase, DO NOT IMPLEMENT.



Produce a structured MASTER IMPLEMENTATION PLAN containing:



1. Product architecture

2. Information architecture

3. Master user journey

4. State model for No-Login → Known User

5. Page / experience map

6. Component architecture

7. AI Concierge architecture

8. Readiness / Match / Opportunity logic boundaries

9. Data model proposal

10. Backend and API boundaries

11. Security/privacy architecture

12. Visual system

13. Motion system

14. Mobile UX strategy

15. Performance strategy

16. Phased build sequence

17. What should be mocked first vs built for real

18. Acceptance criteria for Phase 1

19. Risks and architectural decisions that need Founder approval



PHASE 1 GOAL:

Do not build the entire company at once.



Phase 1 should produce an exceptional interactive public product experience with:

- Home

- AI Concierge journey

- Credit journey prototype

- Readiness

- Match

- Market Radar

- Opportunity experience

- personalization states



with explicit interfaces for later production backend connections.



The Phase 1 experience must be strong enough that the Founder can perform visual/UX QA before production backend integration.



Do not optimize for minimum effort.

Optimize for a category-defining final product.



Before proposing implementation, challenge any architectural decision that could prevent TashilRadar from becoming a scalable production financial platform.



Return the plan only.

Wait for Founder approval before implementation.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/24d24506-7fcd-48eb-b3aa-7446f69f51d8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
