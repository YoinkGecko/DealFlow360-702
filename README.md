# DealFlow360 API (Phase 2)

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

Unit tests cover `computeBlendedRisk` including the Gold Hardware/Service blended scenario.

## Email (Nodemailer)

No Gmail required for local development. Uses **Nodemailer** with `EMAIL_TRANSPORT`:

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
