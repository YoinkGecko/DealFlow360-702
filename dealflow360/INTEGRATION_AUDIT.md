# DealFlow360 Frontend Integration Audit (Step 1)

> Generated before any integration code changes. Scope: wire React UI (`dealflow360/`) to Fastify API (`dealflow360-api/`).

---

## 1. Existing API / Auth Infrastructure

| Item | Status | Notes |
|------|--------|-------|
| `src/lib/api.ts` | **Partial** | `apiFetch()` wraps `fetch`, reads `VITE_API_URL` (default `http://localhost:3000`), attaches JWT from `localStorage` (`dealflow360_token`). Throws `ApiError` on non-OK. **No 401 redirect**, no centralized error shape for UI, no typed endpoint helpers. |
| `src/lib/auth.ts` | **Wired** | `loginUser` → `POST /auth/login`, `signupUser` → `POST /auth/signup`, `fetchCurrentUser` → `GET /auth/me`, token storage. |
| `src/context/AuthContext.tsx` | **Wired** | On mount: if token exists, calls `GET /auth/me`. Exposes `login`, `signup`, `logout`, `user`, `loading`, `isAuthenticated`. |
| `src/context/AppContext.tsx` | **100% mock** | All business state from `data/mock.ts`. Local mutations only — no API calls. |
| `portalApiClient` | **Missing** | No portal fetch helper; no portal routes/pages exist. |
| `api-client.ts` (typed) | **Missing** | User spec requests `src/lib/api-client.ts`; current code uses `api.ts` + `auth.ts`. |
| Env var | **Exists** | `.env.example`: `VITE_API_URL=http://localhost:3000` (spec says `VITE_API_BASE_URL` — naming mismatch only). |
| Backend CORS | **OK** | `@fastify/cors` registered with `{ origin: true }` in `dealflow360-api/src/index.ts`. |
| Route guard (login) | **OK** | `App.tsx` `ProtectedApp` redirects unauthenticated users to `/login`. |
| Role-based nav | **Partial** | `AppLayout.tsx` hides nav items by role. **Action buttons** (approve/reject, allocate, etc.) are not gated by role. |
| Role-based route guard | **Missing** | No per-route redirect if role lacks access (only nav hiding). |

---

## 2. Auth State

| Location | Status | Details |
|----------|--------|---------|
| `AuthPages.tsx` (Login) | **Wired** | `POST /auth/login` via `useAuth().login`, error display, redirect to `/app`. |
| `AuthPages.tsx` (Signup) | **Wired** | `POST /auth/signup` via `useAuth().signup`, role select, redirect to `/app`. |
| `AuthContext.tsx` | **Wired** | Real JWT + `GET /auth/me` on load. |
| `AppContext.tsx` `user` | **From auth** | Passes through real user from `useAuth()` — not hardcoded. |
| `ProfilePage` | **Wired (read-only)** | Displays real user from context; logout works. |
| `AppLayout` TopBar/Sidebar | **Wired (display)** | Real user name/role; notifications are **mock** from `AppContext`. |
| Portal auth | **N/A (missing)** | No portal pages; must not share JWT/session when built. |

---

## 3. Mock Data Source (`src/data/mock.ts`)

Used directly or via `AppContext`:

- `DEALS` (6 deals, IDs like `DF-1042`)
- `INITIAL_DEAL_LINES`, `PRODUCTS`, `CUSTOMERS`, `WAREHOUSES`
- `INVOICES`, `SUBSCRIPTIONS`, `RECOMMENDATIONS`
- `INITIAL_AUDIT`, `NOTIFICATIONS`, `PIPELINE_STAGES`

Types (`UserRole`, `Deal`, `DealStage`, etc.) are reused across the app — keep types, replace data sources.

---

## 4. Screen-by-Screen Audit

### 4.1 Marketing

| Component | Mock / Stub | Actions Not Hitting API |
|-----------|-------------|-------------------------|
| `LandingPage.tsx` | Static marketing copy + demo KPI cards | N/A (no backend expected) |

### 4.2 Overview (`OverviewPage.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| KPI cards (6 metrics) | Hardcoded `KPI` array | **No backend endpoint** — derive from quotes or leave aggregated stubs |
| Pipeline bar chart | `PIPELINE_STAGES` mock | Derive from `GET /quotes` grouped by status |
| Risk pie chart | Hardcoded `RISK_DATA` | Derive from `GET /quotes` `blendedRiskScore` |
| Approval queue table | `useApp().deals` filtered `pending_approval` | `GET /quotes?status=PENDING_APPROVAL` |
| Fulfillment stats | Hardcoded (24, 3, 68%, ₹385) | **No global fulfillment stats endpoint** |
| Recent activity | Hardcoded `ACTIVITY` array | **No activity feed endpoint** — could use latest audit events |

### 4.3 Deals List (`DealsPage` in `DealsPages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Deal table + tabs | `useApp().deals` (mock) | `GET /quotes` (+ optional `?status=`) |
| Stage filter tabs | Client filter on mock `DealStage` | Map backend `QuoteStatus` → UI stages |
| **New Deal** button | Links to hardcoded `/app/deals/DF-1042` | `POST /quotes` with `customerId` |
| Filter / Export buttons | No handlers | Stubs (no API) |

### 4.4 Deal Workspace (`DealWorkspacePage` in `DealsPages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Deal header, lines, summary | `useApp().deals` + local state | `GET /quotes/:id` |
| Risk panel | **Client-side** `calculateRisk()` | Use API `blendedRiskScore` + policy from `GET /policy/*` |
| Discount edit | `updateDealLines()` — local only | **No PATCH line endpoint** — may need add-line flow or flag gap |
| **Submit for Approval** | `submitForApproval()` — local stage change | `POST /quotes/:id/submit` |
| **Save Draft** | No handler | Stub |
| **Add Product** | No handler | `POST /quotes/:id/lines` then re-fetch `GET /quotes/:id` |
| Upsell / recommendations panel | **Not present in UI** | `GET /products/:id/recommendations` (add to workspace or wire `RecommendationsPage`) |
| **Send to customer** | **Not present in UI** | `POST /quotes/:id/send` + `POST /portal/request-access` |
| Change requests (rep side) | **Not present in UI** | `GET /quotes/:id/change-requests`, `POST .../respond` |
| Lifecycle stepper | Derived from mock `deal.stage` | Map from `quote.status` |

**Shape mismatches:** UI uses `DF-1042` string IDs; API uses UUIDs. UI `discount` vs API `discountPercent`. UI `QuoteLine.cost` not in API response.

### 4.5 Approvals (`ApprovalsPage` in `CorePages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Queue table | Mock deals `pending_approval` | `GET /quotes?status=PENDING_APPROVAL` + filter by user's pending `approvals` |
| Drawer risk panel | Client `calculateRisk()` | Server risk + approval records from quote detail |
| Hardcoded reason / audit bullets | Static strings | From quote + `GET /audit/quotes/:id` |
| **Approve** | `approveDeal()` — local | `POST /quotes/:id/approvals/:approvalId/decide` `{ decision: "APPROVED", reason }` |
| **Reject** | `rejectDeal()` — local | Same with `REJECTED` |
| **Request Changes** | No handler | `REVISION_REQUESTED` via decide endpoint |
| Reason field before submit | **Missing** | Backend **requires** `reason` (min 1 char) |
| Role gating | Any logged-in user can approve | Only `MANAGER` / `FINANCE` / `ADMIN` per API |

### 4.6 Customers (`CustomersPage` in `CorePages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Customer table | Inline hardcoded array (4 rows) | **No `GET /customers` endpoint on backend** |
| Drawer / tabs | Static | Gap — need backend endpoint or derive unique customers from quotes |

### 4.7 Products (`ProductsPage` in `CorePages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Product table | Inline hardcoded array (5 rows) | `GET /products` |
| **+ New Product** | No handler | `POST /products` (ADMIN only) |

### 4.8 Policies (`PoliciesPage` in `CorePages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Ceilings table | `useApp().policy` (`DEFAULT_POLICY` local) | `GET /policy/ceilings` |
| Approval thresholds | Local `policy.managerThreshold` / `financeThreshold` | `GET /policy/approval-chains` |
| **Save Configuration** | `updatePolicy()` — local state only | `POST /policy/ceilings` + approval chain upsert (ADMIN) |

### 4.9 Fulfillment (`FulfillmentPage` in `OperationsPages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| KPI cards | Hardcoded | **No global stats endpoint** |
| Warehouse cards | `WAREHOUSES` mock | **No `GET /warehouses` endpoint** |
| Allocation optimizer | Hardcoded `ALLOCATION` for DF-1028 | `GET /quotes/:id/fulfillment` (per quote) |
| **Accept Suggested Split** | No handler | `POST /quotes/:id/fulfillment/allocate` |
| **Manual Override** | No handler | Stub (no API) |
| Quote selector | Hardcoded to DF-1028 | User must pick quote (from approved/confirmed quotes) |

### 4.10 Billing (`BillingPage` in `OperationsPages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| KPI cards | Hardcoded | **No global billing dashboard endpoint** |
| Invoice table | `INVOICES` mock | **No `GET /invoices` endpoint** — API has per-quote `GET /quotes/:id/ledger` |

### 4.11 Subscriptions (`SubscriptionsPage` in `OperationsPages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Subscription list | `SUBSCRIPTIONS` mock | **No global subscriptions list** — subs are per-quote |
| Proration calculator | **Client-side** `calculateProration()` on mock `SUBSCRIPTIONS[0]` | `PATCH /quotes/:id/subscriptions/:subId` then `GET /quotes/:id/ledger` |
| **Apply Change** | No handler | `PATCH` + ledger re-fetch |
| Attach subscription | **Not in UI** | `POST /quotes/:id/subscriptions` |

### 4.12 Recommendations (`RecommendationsPage` in `OperationsPages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Recommendation cards | `RECOMMENDATIONS` mock | `GET /products/:productId/recommendations` |
| **Add to Quote** | No handler | `POST /quotes/:id/lines` (needs active quote context) |

API returns `{ productId, productName, liftScore }` — UI shows lift/margin/confidence/reason (extra fields not in API).

### 4.13 Deal Health (`DealHealthPage` in `OperationsPages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Anomalies table | Hardcoded 2 rows | `GET /deal-health/anomalies` |
| Stalled deals table | Hardcoded 2 rows | `GET /deal-health/stalled` |
| **Nudge Rep** | No handler | **No nudge endpoint** (hide or stub) |
| Click → quote detail | Not wired | Navigate using `quoteId` from response |

### 4.14 Analytics (`AnalyticsPage` in `OperationsPages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Charts + KPIs | All hardcoded | **No analytics endpoints** — out of scope unless derived from quotes |

### 4.15 Audit Log (`AuditLogPage` in `SystemPages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Event table | `useApp().auditEvents` (mock `INITIAL_AUDIT`) | Needs quote-scoped `GET /audit/quotes/:id` — **no global audit list endpoint** |
| Event detail drawer | Mock events | Map API `events[]` shape (`type`, `payload`, `actorUserId`, `createdAt`) |

### 4.16 What-if Replay (`WhatIfPage` in `SystemPages.tsx`)

| Data | Source | Target API |
|------|--------|------------|
| Original / replay risk | Client `calculateRisk()` on `INITIAL_DEAL_LINES` | `POST /audit/quotes/:id/replay` with hypothetical ceiling body |
| **Replay Decision** | Toggles local state only | Real replay API response (actual vs hypothetical) |
| Quote selector | Uses static mock lines, not a real quote ID | Needs quote picker + UUID |

### 4.17 Warehouses / Settings / Help

| Page | Status |
|------|--------|
| `WarehousesPage` | Hardcoded 4 DC names; Configure buttons inert. **No warehouses API.** |
| `SettingsPage` | Read-only hardcoded org fields. **No settings API.** |
| `HelpPage` | Static content only (OK) |

### 4.18 Layout (`AppLayout.tsx`)

| Feature | Status |
|---------|--------|
| Notifications dropdown | Mock `NOTIFICATIONS` from `AppContext`; `markNotificationRead` local only. **No notifications API.** |
| Search input | No handler (stub) |
| Role badge / nav | Uses real auth user role |

---

## 5. Customer Portal (Entire Flow Missing)

| Expected route / feature | Frontend status |
|--------------------------|-----------------|
| `/portal/quote/:token` | **Route does not exist** in `App.tsx` |
| Portal quote view | **No component** |
| Portal change requests | **No component** |
| Portal confirm | **No component** |
| Rep: Send to customer | **No button** in deal workspace |
| Rep: View/respond change requests | **No UI** |
| Separate `portalApiClient` (no JWT) | **Not implemented** |

Backend portal routes exist: `POST /portal/request-access`, `GET /portal/quotes/:token`, change-requests CRUD, `POST .../confirm`.

---

## 6. `AppContext` Stub Actions (All Need Replacement)

| Method | Current behavior | Replacement |
|--------|------------------|-------------|
| `updateDealLines` | Local recalc via `calculateRisk` | API line mutations + `GET /quotes/:id` |
| `submitForApproval` | Sets `stage: pending_approval` | `POST /quotes/:id/submit` |
| `approveDeal` | Sets `stage: approved` | `POST /quotes/:id/approvals/:approvalId/decide` |
| `rejectDeal` | Sets `stage: rejected` | Same decide endpoint |
| `updatePolicy` | Local state | `GET/POST /policy/*` |
| `addAuditEvent` | Prepends mock event | Remove — fetch audit from API |
| `markNotificationRead` | Local | Remove or defer (no API) |
| Initial state (`deals`, `auditEvents`, `notifications`) | From `mock.ts` | Fetch on mount / per-screen |

---

## 7. Client-Side Logic to Replace with API Truth

| Function | Used in | Replace with |
|----------|---------|--------------|
| `calculateRisk()` | Deal workspace, Approvals, What-if | `quote.blendedRiskScore` + policy ceilings from API; keep for display breakdown only if API doesn't provide breakdown |
| `calculateProration()` | Subscriptions page | Ledger lines from `GET /quotes/:id/ledger` after PATCH |
| `DEFAULT_POLICY` / local policy | AppContext, Policies, What-if | `GET /policy/ceilings`, `GET /policy/approval-chains` |

---

## 8. Backend Gaps / Shape Mismatches (Flag Before Wiring)

| Gap | Impact | Proposed handling |
|-----|--------|-------------------|
| No `GET /customers` | Customers page | Flag to user; derive from quotes or skip until backend added |
| No `GET /warehouses` | Fulfillment + Warehouses pages | Show per-quote fulfillment only; warehouse cards from allocation response or flag |
| No global invoices / subscriptions list | Billing + Subscriptions list views | Scope to quote-centric UI (pick quote → ledger/subs) |
| No global audit log | Audit page | Quote picker + `GET /audit/quotes/:id`, or list quotes and drill in |
| No notifications API | Top bar bell | Leave empty / remove unread count, or derive from pending approvals |
| No analytics API | Analytics page | Derive basic stats from quotes or show "no data" |
| No PATCH quote line | Discount editing in workspace | May only support add-line with discount; flag if inline edit needed |
| Quote IDs: `DF-xxxx` vs UUID | All deal links | Update UI to use UUIDs from API |
| Quote status enum mismatch | Stage badges/tabs | Map `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `SENT`, `UNDER_NEGOTIATION`, `CONFIRMED`, etc. |
| Recommendations response shape | Recs page cards | Show `liftScore` only; drop mock margin/confidence unless backend extended |
| `POST /portal/request-access` requires auth? | Rep sending link | Verify — route has no `onRequest` auth in portal routes (may need JWT for rep action from internal UI) |

---

## 9. Integration Priority (Suggested Step 2 → 3 Order)

1. **Infrastructure:** `api-client.ts`, portal client, 401 redirect, env alias, shared types/mappers
2. **AppContext refactor:** Remove mock state; add data hooks or fetch-on-demand per screen
3. **Deals pipeline:** List → detail → add line → submit (Flow A core)
4. **Approvals:** Queue + decide with reason (Flow A)
5. **Fulfillment + Billing:** Per-quote allocate + subscription + ledger (Flow B)
6. **Deal health + Audit + What-if**
7. **Portal:** New routes/pages + rep send-link + change-request UI (Flow C)
8. **Secondary screens:** Products, Policies, Customers (with gaps noted)
9. **Overview / Analytics:** Derive or degrade gracefully

---

## 10. Test Flows vs Current State

| Flow | Can run today? | Blockers |
|------|----------------|----------|
| **A:** Rep → build → discount → submit → Manager approve → audit | **No** | All deal/approval state is mock |
| **B:** Approve → allocate → subscription → proration ledger | **No** | Fulfillment/billing pages use static data |
| **C:** Portal send → counter-discount → rep accept → re-approve → confirm | **No** | Portal UI missing; rep actions missing |

Auth login/signup **can** run against real API if backend is up.

---

*End of Step 1 audit. No integration code has been changed yet.*
