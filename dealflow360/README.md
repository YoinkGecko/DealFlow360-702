# DealFlow360 Frontend

React SPA for the DealFlow360 B2B sales operations platform. Connects to `dealflow360-api` on port 3000.

## Run locally

```bash
# Terminal 1 — API (see dealflow360-api/README.md)
cd dealflow360-api && npm run dev

# Terminal 2 — UI
cd dealflow360
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

Set `VITE_API_URL=http://localhost:3000` in `.env` if the API is not on the default host.

## Test logins

| Role | Email | Password |
|------|-------|----------|
| Sales Rep | rep@dealflow360.test | password123 |
| Manager | manager@dealflow360.test | password123 |
| Finance | finance@dealflow360.test | password123 |
| Admin | admin@dealflow360.test | password123 |

Run `npm run seed` in `dealflow360-api` before demos for fresh data.

## Features

- **RBAC** — `src/lib/permissions.ts` + `<Can action="...">` / `usePermission()` hide unauthorized actions
- **Search** — Deals, Customers, Products; global top-bar search → deals list
- **Pagination** — Deals, Customers, Products, Approvals, Audit tab, Deal Health lists
- **Theme** — Sun/moon toggle in top nav (and on customer portal); persisted in localStorage

## Demo flows

See **Flow A** and **Flow B** in [dealflow360-api/README.md](./../dealflow360-api/README.md) for step-by-step click paths with current UI labels.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (CSS variables for theming)
- React Router
- Recharts
- Lucide icons

## Key routes

| Screen | Route |
|--------|-------|
| Landing | `/` |
| Login / Signup | `/login`, `/signup` |
| Overview | `/app` |
| Deals | `/app/deals` |
| Deal workspace | `/app/deals/:id` |
| Approvals | `/app/approvals` |
| Customer portal | `/portal/quote/:token` |
