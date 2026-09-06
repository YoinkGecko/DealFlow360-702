# DealFlow360 API (Phase 4)

Event-sourced modular monolith backend for DealFlow360.

## Stack

- Node.js + TypeScript + Fastify
- Prisma + PostgreSQL (Docker)
- JWT auth, Zod validation, Swagger at `/docs`
- In-process typed event bus

## Quick start

```bash
cd dealflow360-api
cp .env.example .env   # if needed
docker compose up -d
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

**Swagger UI:** [http://localhost:3000/docs](http://localhost:3000/docs)

**OpenAPI JSON:** [http://localhost:3000/docs/json](http://localhost:3000/docs/json)

## Seeded test users

| Role    | Email                     | Password    |
|---------|---------------------------|-------------|
| REP     | rep@dealflow360.test      | password123 |
| MANAGER | manager@dealflow360.test  | password123 |
| FINANCE | finance@dealflow360.test  | password123 |
| ADMIN   | admin@dealflow360.test    | password123 |

After `npm run seed`, the console prints the **Gold customer ID** and **product IDs**.

## 2-minute Swagger walkthrough (discount → approval flow)

1. Open **http://localhost:3000/docs**
2. **POST /auth/login** — use `rep@dealflow360.test` / `password123`
3. Copy `token` → click **Authorize** → `Bearer <token>`
4. **GET /products** — note a Hardware and Service product ID
5. **POST /quotes** — body: `{ "customerId": "<gold-customer-id-from-seed>" }`
6. **POST /quotes/{id}/lines** — add Hardware line with `discountPercent: 12` (within ceiling)
7. **POST /quotes/{id}/lines** — add Service line with `discountPercent: 18` (above 10% Gold/Service ceiling)
8. **GET /quotes/{id}** — see `blendedRiskScore` > 0
9. **POST /quotes/{id}/submit** — creates approval chain from DB rules
10. Re-login as **manager@dealflow360.test**, authorize, **POST /quotes/{id}/approvals/{approvalId}/decide** with `{ "decision": "APPROVED", "reason": "Margin acceptable" }`
11. If risk > 0.5, repeat with **finance@dealflow360.test**
12. **GET /audit/quotes/{id}** — full immutable event trail (`QuoteCreated` → `LineAdded` → `RiskScoreComputed` → `ApprovalRequested` → `ApprovalDecided`)

## Tests

```bash
npm test
```

Unit tests cover:

- `computeBlendedRisk` (discount governance)
- `allocateLine` (warehouse greedy allocator)
- `computeProratedCharge` (subscription proration — ₹2000 upgrade / -₹2000 downgrade on day 10)
- `computeLift` (recommendation lift scoring)
- `detectDiscountAnomaly` (z-score discount anomaly detection)
- `computeStageThreshold` / `isStalled` (adaptive IQR stall detection)

## Testing Deal Health + Replay in Swagger

1. **GET /deal-health/anomalies** — seeded DRAFT quote has a Service line at **25%** discount (rep history is 5–8%); see `zScore > 2`
2. **GET /deal-health/thresholds** — computed stall thresholds per status with sample counts (`usingFallback: false` when ≥ 8 samples)
3. **GET /deal-health/stalled** — stalled PENDING_APPROVAL quote appears first (`dwellDays` > threshold)
4. Create a quote via Phase 1 flow (or use an existing quote with `LineAdded` events)
5. **POST /audit/quotes/{id}/replay** — body example:
   ```json
   {
     "hypotheticalCeilings": [
       { "category": "Service", "customerTier": "Gold", "ceilingPercent": 18 }
     ]
   }
   ```
6. Compare `actual` vs `hypothetical` `riskScore` and `routing` side by side; `linesUsedInReplay` shows event-reconstructed lines only

Re-backfill stage transitions from CONFIRMED quotes:

```bash
npm run seed:stage-transitions
```

## Testing Flow B end to end in Swagger

After Phase 1 approval flow completes (`quote.status === APPROVED`):

1. **POST /quotes/{id}/fulfillment/allocate** — run greedy warehouse split (or rely on auto-allocation after approval)
2. **GET /quotes/{id}/fulfillment** — see per-line warehouse breakdown and any backorders
3. **POST /quotes/{id}/confirm** — mark quote `CONFIRMED` (updates recs co-occurrence counts live)
4. **POST /quotes/{id}/subscriptions** — body: `{ "planId": "<support-plan-id-from-seed>", "quantity": 2 }`
5. **GET /quotes/{id}/ledger** — see `RECURRING_CHARGE` line (₹6000 for 2 × ₹3000)
6. **PATCH /quotes/{id}/subscriptions/{subId}** — body: `{ "newQuantity": 3 }` mid-cycle → prorated charge
7. **GET /quotes/{id}/ledger** again — new `PRORATED_CHARGE` line appears (append-only ledger)
8. **GET /products/{laptopId}/recommendations** — see **Laptop Bag** with lift > 1 from seeded order history

Re-bootstrap recs from all `CONFIRMED` quotes:

```bash
npm run seed:recompute-cooccurrence
```

## Phase 2 modules

| Module | Endpoints | Pure logic |
|--------|-----------|------------|
| Fulfillment | `POST/GET /quotes/:id/fulfillment` | `allocator.ts` |
| Billing | `POST/PATCH subscriptions`, `GET ledger` | `proration.ts` |
| Recs | `GET /products/:id/recommendations` | `lift-engine.ts` |

Event reactions (`src/core/event-handlers.ts`):

- `QuoteAutoApproved` / `ApprovalDecided` (→ APPROVED) → auto warehouse allocation
- `QuoteConfirmed` → update co-occurrence counts; billing stub (one-time charges → ledger is Phase 3)

## Phase 3 modules

| Module | Endpoints | Pure logic |
|--------|-----------|------------|
| Deal Health | `GET /deal-health/anomalies`, `stalled`, `thresholds` | `anomaly-detector.ts`, `stall-detector.ts` |
| Audit (replay) | `POST /audit/quotes/:id/replay` | `replay.ts` (uses `computeBlendedRisk` from Phase 1) |

`QuoteStageTransition` rows are written by an event-bus listener (`stage-transition.listener.ts`) — never inline in route handlers.

## Testing the negotiation loop in Swagger

**Refactor note:** Phase 1 submit routing was extracted to `src/modules/policy/approval-routing.ts` — `routeForRiskScore()` + `applyApprovalRouting()` are shared by `POST /quotes/:id/submit` and portal counter-discount acceptance.

1. Run Phase 1 flow to create + submit + approve a quote (or use an existing `APPROVED` quote)
2. **POST /quotes/{id}/send** — status → `SENT`
3. **POST /portal/request-access** — body: `{ "quoteId": "...", "customerEmail": "procurement@acmecorp.test" }`
4. If `RESEND_API_KEY` is set, the magic link is emailed; otherwise copy `token` / `link` from the response (also logged in the API console)
5. **GET /portal/quotes/{token}** — customer read-only view
6. **POST /portal/quotes/{token}/change-requests** — counter with high discount, e.g.:
   ```json
   { "quoteLineId": "<line-id>", "type": "COUNTER_DISCOUNT", "proposedDiscountPercent": 22, "message": "Can we do better?" }
   ```
7. As rep: **GET /quotes/{id}/change-requests** → **POST /quotes/{id}/change-requests/{reqId}/respond** with `{ "decision": "ACCEPTED" }`
8. If risk crosses threshold → quote auto-moves to `PENDING_APPROVAL` with new Approval rows (`QuoteReenteredApproval` event)
9. Approve as manager/finance (Phase 1 flow)
10. **POST /portal/quotes/{token}/confirm** — emits `QuoteConfirmed` (same handlers as internal confirm: recs, billing stub)
11. **GET /audit/quotes/{id}** — full negotiation trail in the event log

## Phase 4 modules

| Module | Endpoints | Shared Phase 1 logic |
|--------|-----------|---------------------|
| Portal | `POST /portal/request-access`, `GET /portal/quotes/:token`, change-requests, confirm | `computeBlendedRisk`, `routeForRiskScore`, `applyApprovalRouting`, `emitQuoteConfirmed` |
| Quotes (extended) | `POST /quotes/:id/send`, change-request respond | Same approval routing refactor |

### Portal magic-link email (Resend)

Set these in `.env` to send real emails from `POST /portal/request-access`:

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) (free tier works) |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `DealFlow360 <onboarding@resend.dev>` |
| `PORTAL_BASE_URL` | Base URL for the clickable link, e.g. `http://localhost:3000` |

Without `RESEND_API_KEY`, the flow still works end-to-end: the magic link is **logged to the API console** and returned in the JSON response (`token` + `link`) so Swagger testing never requires an inbox.

## Architecture notes

| Value | Behavior |
|-------|----------|
| `console` (default) | Prints emails in the API server terminal |
| `ethereal` | Free test inbox — preview URL logged after each send |
| `smtp` | Real SMTP — set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in `.env` |

Welcome email runs on signup. Failures are non-blocking in dev.

## Architecture notes

- Every quote write appends to `events` first, then updates read models
- Discount ceilings and approval chains are **database config** — no hardcoded thresholds in code
- `resolveApprovalChain()` reads `ApprovalChainRule` rows; risk `0` = auto-approve
- `LedgerLine` rows are append-only (never updated/deleted) — same principle as `events`

## Email (Nodemailer)
