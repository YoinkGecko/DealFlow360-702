# DealFlow360

**Sales freedom. Business control.**

Phase 1 — Production-quality responsive web UI for the DealFlow360 B2B Sales Operations platform.

## Run locally

```bash
cd dealflow360
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Demo flow

1. **Landing** → Get Started / Sign In
2. **Login** → any password → enters app
3. **Overview** — KPIs, pipeline, approval queue, activity feed
4. **Deals → DF-1042** — change line discounts → risk score updates live
5. **Submit for Approval** → check Approvals drawer
6. **Pricing & Policies** — adjust thresholds (Admin role)
7. **What-if Replay** — change Gold/Services ceiling → replay decision
8. **Subscriptions** — change seat count → proration updates
9. **Audit Log** — immutable event timeline
10. **Role selector** (top bar) — switch Sales Rep / Manager / Finance / Admin

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- React Router
- Recharts
- Lucide icons

## Key screens

| Screen | Route |
|--------|-------|
| Landing | `/` |
| Login / Signup | `/login`, `/signup` |
| Overview | `/app` |
| Deal Workspace | `/app/deals/DF-1042` |
| Approvals | `/app/approvals` |
| Fulfillment | `/app/fulfillment` |
| Subscriptions | `/app/subscriptions` |
| Audit Log | `/app/audit` |
| What-if Replay | `/app/what-if` |
