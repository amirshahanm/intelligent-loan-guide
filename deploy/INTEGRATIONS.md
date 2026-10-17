# Integration activation gates

API.ir SMS adapter follows https://s.api.ir/json (`POST /api/sw1/SmsOTP`).
It sends the application-generated OTP, requires `success: true` and `data: true`,
uses a 10 second timeout and never retries automatically. Delivery acceptance
is not proof of handset receipt.

Server runtime configuration only (never VITE variables or Docker build args):

- `TASHILRADAR_APIIR_TOKEN`: scoped provider credential stored outside the repo.
- `TASHILRADAR_APIIR_SMS_ENABLED=true`: explicit billing activation switch.
- Existing secure OTP prerequisites: Supabase server URL/service-role credential,
  `TASHILRADAR_OTP_PEPPER` and request fingerprint secret, with deployed OTP and
  request-limit RPCs. Adapter configuration alone does not establish secure login.

Defaults remain unavailable in production; demo behavior remains unchanged.
The dedicated credential is now provisioned in protected, server-only storage;
it has not been injected into the public application container.
No billable provider request has been made by tests.

### Account activation evidence — 2026-10-09

Owner explicitly approved creation of the dedicated `TashilRadar Server` key.
The initial submission redirected to `/user/verify`. The owner completed
verification directly in API.ir. The dedicated key was then generated and its
vendor download moved from Downloads to ACL-restricted storage outside the repo.
The server copy is root-owned mode 0600 under a mode-0700 directory. Values were
not printed, committed, built into assets or included in screenshots.

Actual Germany-host egress was verified as `188.40.20.135`; the API.ir key was
restricted to that address and the panel shows it as valid. The free Sandbox Echo
probe from this server returned HTTP 200, success=true, tokenStatus=true.
This verifies credential/network connectivity only. The application container
still has no injected API.ir token, and identity/bank matching remains unavailable
until trusted case ownership, consent and durable billing controls are connected.
The currently connected Supabase MCP organization lists only Beauty projects,
not the locked `logsusogxmuprewlxrvf` TashilRadar project. Do not substitute another
project or claim that production backend access is verified.

Before live activation: approve scoped persistent key creation, confirm provider
IP restrictions against actual server egress, inject secrets through protected
runtime configuration, verify database RPCs and rate limits, then explicitly
authorize one SMS to an owner-controlled phone. Do not log code or phone.
Rollback: remove SMS enable flag and restart only the application container.

Shahkar, bank matching and active loans are not official credit scores. They
remain unconnected until an authenticated, consent-bound server inquiry path
and billing controls are available. Finnotech registration belongs to the owner.
Payment remains unavailable until a merchant provider/contract is established.

## Identity and bank matching adapters

`apiir-matching.server.ts` implements only the documented `Shahkar`,
`CardMatch` and `IbanMatch` boolean contracts. A valid negative match is distinct
from an unavailable/failed request. Each result carries source, inquiry identity
and retrieval time; no credit score, eligibility or approval is inferred.

This is an internal adapter, not a public server function or a live integration.
Its mandatory authorization callback must be implemented by a trusted server
caller that verifies case ownership, persisted service-specific consent and
atomically reserves a unique inquiry/billing attempt. A client-supplied boolean
or an empty authorization callback is not an acceptable production implementation.
Retries after timeout require reconciliation rather than another paid request.
It is deliberately not registered or exposed to frontend until these gates pass.

The public OpenAPI inspected on 2026-10-09 contains no identified official
credit-rank or Sakha-code endpoint. Public marketing is not evidence of enabled
account access. Do not alias ActiveLoans, cheque inquiries, bank matching or
driving penalty score to a credit-bureau score.

## Paid service release sequence

Owner intends to offer credit reports/rank and potentially Sakha-code assistance.
Those are candidates, not currently sellable capabilities. Sakha service scope
and official partner API/permissions need verification before implementation.

1. Confirm provider contract, permitted resale, exact output and enabled access.
2. Configure the approved SMS provider (MelliPayamak pattern request is pending;
   API.ir SMS remains disabled, not an automatic paid fallback).
3. Verify secure identity/session storage and consent in the production backend.
4. Define server-owned service SKU, authoritative price and delivery/refund policy.
5. Create a durable order linked to service, user/case and consent. Never accept a
   browser-provided amount as authoritative for a production order.
6. Implement Zarinpal request/callback/verification against that stored order.
   Callback status alone is not payment proof; duplicate callbacks must not
   deliver twice. Reconcile ambiguous provider outcomes before charging again.
7. Test owner-controlled SMS and sandbox payment paths, then approve a bounded
   live transaction. No live merchant credential or payment path is active yet.

Screenshots of other products may inform candidate services but do not establish
API availability, user consent, resale permission or a verified price.
