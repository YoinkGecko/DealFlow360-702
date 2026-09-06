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

**Frontend (separate terminal):**

```bash
cd dealflow360
npm install
npm run dev   # http://localhost:5173
```

## Seeded test users

| Role    | Email                     | Password    |
|---------|---------------------------|-------------|
| REP     | rep@dealflow360.test      | password123 |
| MANAGER | manager@dealflow360.test  | password123 |
| FINANCE | finance@dealflow360.test  | password123 |
| ADMIN   | admin@dealflow360.test    | password123 |

## Re-running the seed

```bash
cd dealflow360-api
npm run seed
```

The seed script **clears and rebuilds** demo data. Console output prints IDs you need for demos (customer, products, plan, anomaly quote, stalled quote, backorder quote, portal token, etc.).

### What the seed includes (computed via real services)

| Table / feature | How it is seeded |
|-----------------|------------------|
| **Users, customers, products, warehouses, stock** | Hand-authored baseline records |
| **Historical CONFIRMED quotes** | Real `computeQuoteBlendedRisk()` + decided **Approval** rows from `routeForRiskScore()` |
| **Allocation** | `allocateQuoteFulfillment()` on 3+ confirmed quotes (real warehouse splits) |
| **Backorder** | Quote with 30 laptops vs 25 total stock → backorder from same allocator |
| **LedgerLine** | `addSubscriptionToQuote()` → `RECURRING_CHARGE`; `changeSubscriptionQuantity()` → `PRORATED_CHARGE` |
| **QuoteStageTransition** | Backfilled for all CONFIRMED quotes (Deal Health) |
| **Stalled quote** | `applyApprovalRouting()` → live PENDING approvals |
| **ChangeRequest** | PENDING on stalled quote; ACCEPTED on negotiation SENT quote |
| **PortalSession** | Token `seed-portal-{quoteId-prefix}` on negotiation quote |
| **Co-occurrence / recs** | Recomputed from CONFIRMED quote history |

Optional maintenance scripts:

```bash
npm run seed:stage-transitions      # Re-backfill stage transitions
npm run seed:recompute-cooccurrence # Rebuild recommendation pairs
```

## Permissions model (backend + frontend)

Frontend mirrors these in `dealflow360/src/lib/permissions.ts` (`usePermission` / `<Can action="...">`).

| Action | Allowed roles | API guard |
|--------|---------------|-----------|
| Create deal | sales_rep, admin | `POST /quotes` |
| Add / edit quote lines | sales_rep, admin | `POST/PATCH /quotes/:id/lines` |
| Submit for approval | sales_rep, admin | `POST /quotes/:id/submit` |
| Send to customer portal | sales_rep, admin | `POST /quotes/:id/send` |
| Approve / reject / request changes | manager, finance, admin | `POST /quotes/:id/approvals/:id/decide` |
| Respond to change requests | sales_rep, admin | `POST /quotes/:id/change-requests/:id/respond` |
| Allocate fulfillment | sales_rep, manager, admin | `POST /quotes/:id/fulfillment/allocate` |
| Billing (attach sub, qty change) | sales_rep, finance, admin | `POST/PATCH /quotes/:id/subscriptions` |
| Create product | admin | `POST /products` |
| Create customer | sales_rep, admin | `POST /customers` |
| Edit policies (ceilings, chains) | admin | `POST /policy/*` |
| Admin settings / warehouses nav | admin | UI-only routes |

Unauthorized write controls are **hidden** in the UI (not shown as disabled buttons).

## Pagination (server-side)

List endpoints return `{ items, total, page, limit, pageCount }`:

| Endpoint | Used on screen |
|----------|----------------|
| `GET /quotes` | Deals list, Approvals queue |
| `GET /products` | Products |
| `GET /customers` | Customers |
| `GET /audit/quotes/:id` | Deal workspace → Audit tab |

Deal Health anomaly/stalled lists use client-side pagination (small fixed datasets).

## Search

| Screen | Behavior |
|--------|----------|
| Deals | `search` query param on `GET /quotes` (customer name) |
| Customers | `search` on `GET /customers` |
| Products | `search` on `GET /products` |
| Top-bar search | Navigates to `/app/deals?search=…` |

## Dark / light mode (frontend)

Toggle the **sun/moon icon** in the top navigation bar. Preference is stored in `localStorage` and applied via `data-theme` on `<html>`. The customer portal (`/portal/quote/:token`) has its own theme toggle and uses the same CSS variables.

---

## Demo walkthrough — Flow A (approval chain)

**Roles:** Rep → Manager (→ Finance if high risk)

1. Log in as **rep@dealflow360.test** / `password123`
2. **Deals** → **New Deal** → pick a Gold customer → **Create Deal**
3. On the **Quote** tab → **Add Product** → add a Hardware line (low discount) and a Service line with **discount above the Gold/Service ceiling** (e.g. 22%)
4. Confirm the risk panel updates → **Submit for Approval**
5. Log out → log in as **manager@dealflow360.test**
6. **Approvals** → open the deal → enter a **reason** → **Approve**
7. If risk is high enough, log in as **finance@dealflow360.test** and approve the Finance step
8. Open the deal → **Audit** tab → verify events: `QuoteCreated` → `LineAdded` → `RiskScoreComputed` → `ApprovalRequested` → `ApprovalDecided`

## Demo walkthrough — Flow B (fulfillment + billing)

**Role:** Rep (and Finance for ledger if needed)

1. Open a **CONFIRMED** seeded deal (or complete Flow A and confirm), e.g. quote with subscription from seed output
2. **Fulfillment** tab → **Allocate** → see warehouse split per line
3. For backorder demo: open seeded **backorder quote** from seed console → Allocate → see backordered quantity
4. **Billing** tab → attach subscription (plan UUID from seed) or view existing ledger
5. **Apply Qty Change** mid-cycle → **Audit** / ledger shows `RECURRING_CHARGE` and `PRORATED_CHARGE`

**Portal negotiation (optional):** `/portal/quote/seed-portal-{prefix}` from seed output → submit change request → Rep responds on **Approvals** or deal **Changes** tab.

---

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
4. If `SMTP_*` is configured, the magic link is emailed; otherwise copy `token` / `link` from the response (also logged in the API console)
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

### Portal magic-link email (Nodemailer SMTP)

Set these in `.env` to send real emails from `POST /portal/request-access`:

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` | SMTP server hostname (e.g. `smtp.gmail.com` or Mailtrap) |
| `SMTP_PORT` | SMTP port (default `587`) |
| `SMTP_SECURE` | `true` for port 465, otherwise `false` |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password or app password |
| `SMTP_FROM` | Sender address, e.g. `DealFlow360 <you@example.com>` |
| `PORTAL_BASE_URL` | Frontend base URL for the clickable link, e.g. `http://localhost:5173` |

Without `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`, the flow still works end-to-end: the magic link is **logged to the API console** and returned in the JSON response (`token` + `link`) so Swagger testing never requires an inbox.

## Architecture notes

| Value | Behavior |
|-------|----------|
| `console` (default) | Prints welcome emails in the API server terminal |
| `ethereal` | Free test inbox — preview URL logged after each send |
| `smtp` | Real SMTP — set `SMTP_*` in `.env` for signup welcome email |

Welcome email runs on signup. Failures are non-blocking in dev.

## Architecture notes

- Every quote write appends to `events` first, then updates read models
- Discount ceilings and approval chains are **database config** — no hardcoded thresholds in code
- `resolveApprovalChain()` reads `ApprovalChainRule` rows; risk `0` = auto-approve
- `LedgerLine` rows are append-only (never updated/deleted) — same principle as `events`

## Email (Nodemailer)
