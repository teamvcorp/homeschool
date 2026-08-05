# The VA School — developer notes

Working notes for this codebase. **Read the relevant file before changing the area it
covers** — several of these record findings that cost real time to establish and are
not obvious from the code.

| File | Read it when |
|---|---|
| [`nextjs-16-conventions.md`](./nextjs-16-conventions.md) | **Before writing any Next.js code.** This version differs substantially from Next 14/15. |
| [`auth-model.md`](./auth-model.md) | Touching sessions, roles, login, or anything behind `/admin` or `/portal`. |
| [`security-checklist.md`](./security-checklist.md) | Before deploying publicly. Also the rules for adding code that touches student data. |
| [`data-dictionary.md`](./data-dictionary.md) | Adding a collection, field, or query. Maps every field to its source document. |
| [`forms-and-validation.md`](./forms-and-validation.md) | **Before touching the enrollment form or the anti-abuse checks.** Records a production incident where the honeypot rejected real families. |
| [`design-system.md`](./design-system.md) | Adding a page or component; picking a colour. |
| [`content-sources.md`](./content-sources.md) | Editing site copy — traces each page to its accreditation-package source. |
| [`verification.md`](./verification.md) | **Before running or adding a test.** How the suite works, and the traps that make test results lie. |

## What this project is

The website and records system for **The Von Der Becke Academy Corp** (DBA **The VA
School**), a K–12 nonpublic school at 503 Lake Ave, Storm Lake, Iowa, operating since
2012 and pursuing Iowa Department of Education accreditation plus Iowa ESA
school-choice funding.

Three things in one codebase:

1. **Public site** — marketing and informational pages, plus the accreditation packet
   published openly for an Iowa DE reviewer.
2. **Enrollment funnel** — the Family Enrollment Agreement (Document 9) as a real
   signed, stored agreement.
3. **Records system** — the four record templates from Document 6, plus applications,
   instructors, and employer partnerships, behind authentication.

## Stack

Next.js 16.3.0 (App Router, Turbopack) · React 19.2.4 · TypeScript strict ·
Tailwind CSS v4 (CSS-first) · MongoDB Atlas via the native driver · own auth
(Argon2id + `jose`) · Zod v4 · Resend

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run db:ping                # confirm Atlas connectivity
npm run db:init                # create indexes (idempotent)
npm run seed:admin -- --email you@example.com --name "Your Name"
npm run dev
```

**`MONGODB_DB` is required and must be a test database locally.** It used to default to
`va_school` — the live database — which is how a destructive test helper once reached
real records. `lib/env.ts` now refuses to use the production database unless
`NODE_ENV=production`, so set `MONGODB_DB=va_school_test` in `.env.local`.

| Environment | `MONGODB_DB` |
|---|---|
| Local / development | `va_school_test` |
| Vercel Production | `va_school` |

A deliberate operation against live data (seeding the first admin, creating indexes)
opts in per command:

```bash
ALLOW_PRODUCTION_DB=1 MONGODB_DB=va_school npm run seed:admin -- --email ... --name "..."
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (**`next lint` no longer exists**) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run typegen` | Regenerate `PageProps`/`LayoutProps`/`RouteContext` |
| `npm run db:ping` | Connectivity + collection/index inventory (prints no secrets) |
| `npm run db:init` | Create indexes |
| `npm run seed:admin` | Create the first administrator |
| `npm run dev:test` | Dev server forced onto `va_school_test` |
| `npm run check:email` | School email rule, 17 assertions, no database needed |
| `npm run e2e` | All five end-to-end harnesses (needs `E2E_ADMIN_PASSWORD`) |
| `npm run seed:test-fixtures` | Fixture accounts; `-- --clear-rate-limits` resets the limiter |
| `npm run db:reset-test` | **Destructive.** Empties the TEST database; refuses production. Needs `-- --yes` |

If the editor reports `PageProps` as missing, run `npm run typegen`.

## Layout

```
app/
  (marketing)/      public pages — shares SiteHeader/SiteFooter
  (docs)/           accreditation packet — minimal print-oriented chrome
  (auth)/           login
  (secure)/         /admin and /portal — auth enforced PER PAGE, not in the layout
  components/
    ui/             shared primitives
    home/           landing-page sections
    secure/         authenticated chrome
  icon.tsx · apple-icon.tsx · opengraph-image.tsx · manifest.ts · sitemap.ts · robots.ts
lib/
  site.ts           SINGLE SOURCE OF BRAND & PROGRAM TRUTH — read this first
  env.ts            zod-validated environment, fails fast
  mongodb.ts        cached client for serverless
  dal.ts            THE AUTHORIZATION BOUNDARY
  audit.ts          append-only access trail
  auth/             password · session · roles · rate-limit
  db/               enums · types · collections · indexes
  actions/          server actions
  content/          accreditation packet content
proxy.ts            optimistic route gate (NOT a security boundary)
scripts/            db-ping · db-init · seed-admin
```

## Two rules worth stating up front

**1. Content facts belong in `lib/site.ts`.** Names, the phone number, cohorts,
pathways, tuition, belt ranks — all of it. The site went from 1 page to ~30 routes;
before this file the nav list was duplicated and the phone number appeared in three
places. If you are about to type a program name into JSX, add it there instead.

**2. `lib/dal.ts` is the only place access is decided.** Not the proxy, not a layout.
See `auth-model.md` for why.
