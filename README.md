# ForecastOS — Frontend

Internal capacity and chargeability management app for Accenture S&P Delivery (Argentina, Mexico, Costa Rica).

> **Backend repo:** [BE-SPForecast](https://github.com/ignacio-mustafha-accenture/BE-SPForecast)

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI Library | Hero UI (`@heroui/react`) + Tailwind CSS v4 |
| Tables | TanStack Table v8 |
| Forms | React Hook Form + Zod |
| State | Zustand v5 |
| Animations | Framer Motion |
| Drag & Drop | dnd-kit |
| i18n | next-intl (ES / EN) |
| Export | xlsx |
| Package manager | pnpm |

---

## Architecture

Clean Architecture with strict layer separation:

```
src/
├── core/
│   ├── domain/          # Domain models (Employee, Ticket, PPA, …)
│   └── ports/           # Repository interfaces
├── adapters/
│   └── http/            # HTTP implementations of the port interfaces
├── application/
│   └── use-cases/       # Business logic (List*, Apply*, Update*, …)
├── views/               # Page-level components (one per route)
├── components/
│   ├── layout/          # Sidebar, TopBar, LanguageSelector
│   ├── ui/              # DataTable, FilterBar, …
│   └── shared/          # ErrorBoundary
├── hooks/               # useCountryEmployees, useDebounce, …
├── store/               # Zustand stores
├── i18n/                # next-intl setup + locale context
└── lib/                 # constants, status helpers
```

---

## Pages

| Route | Description |
|---|---|
| `/login` | Login with email + password |
| `/forgot-password` | Request password reset |
| `/reset-password` | Reset with token (from email) |
| `/` | Dashboard — global KPIs and overview |
| `/ar` | Argentina team — capacity grid |
| `/mx` | Mexico team — capacity grid |
| `/cr` | Costa Rica team — capacity grid |
| `/tickets` | Ticket management (newproj, ongoing, PTO, sick, NJ, baja) |
| `/ppa` | PPA transfer log + new adjustments |
| `/employees/[eid]` | Employee detail view |
| `/admin` | User management + role/permission editor |
| `/agent` | AI agent view |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)
- [BE-SPForecast](https://github.com/ignacio-mustafha-accenture/BE-SPForecast) running on port 8000

### Install & run

```bash
pnpm install
pnpm dev
```

App available at `http://localhost:3000`.

### Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

All `/api/*` requests are proxied server-side to the backend via `next.config.ts` rewrites — HttpOnly auth cookies work transparently.

---

## Auth flow

1. `/login` → `POST /api/auth/login` → backend sets `access_token` HttpOnly cookie
2. `proxy.ts` middleware guards all non-public routes — redirects to `/login` if cookie is absent
3. Cookie is forwarded automatically on every API call through the Next.js rewrite proxy

---

## Deploy (Vercel)

1. Import this repo in [Vercel](https://vercel.com)
2. Set the environment variable:

```
NEXT_PUBLIC_API_BASE_URL=https://<your-railway-backend>.up.railway.app
```

3. Deploy — no other config needed. Vercel detects Next.js automatically.

> The rewrite proxy in `next.config.ts` forwards all `/api/*` calls server-side to the backend URL, so cookies and CORS work without any browser cross-origin issues.
