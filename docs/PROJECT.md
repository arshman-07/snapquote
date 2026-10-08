# SnapQuote — Project Overview

## What it is

A quoting tool for **construction companies and everyday homeowners** (decided
2026-07-13 — originally contractors-only). The user describes a job (room dimensions,
job type, optionally a photo of the area), the app uses AI to determine the materials
needed and their prices, adds a labour cost, and outputs a rough total.

Two audiences, one flow, tailored by a **contractor / homeowner choice at sign-up**:

- **Contractors** price out a quote for a customer: they enter their own labour
  rate (days × daily rate).
- **Homeowners** want to know what a job would cost *them*: the app **estimates a
  typical contractor labour cost** for the job (Phase 3 AI produces this alongside
  the materials estimate).

**Market:** launches in the **US** — currency is **USD**, US units preferred.

## Core quote flow

1. **Enter dimensions** — user inputs room/area dimensions and job/room type.
2. **AI material estimation** — AI returns **three itemized packages** (budget / standard /
   premium) with explanations + buy links; the user picks one.
3. **Material cost** — the chosen package's subtotal feeds the quote.
4. **Labour** — contractors enter **days on site × a daily rate (USD)**; homeowners
   get an **app-estimated typical labour cost** instead (Phase 3).
5. **Photo estimation (optional)** — user snaps a photo of the area; AI refines or adds
   to the estimate based on the image.
6. **Quote summary** — a rough total, broken down (materials + labour), shown to the customer.

## Hosting & stack

- **Self-hosted.** We run the whole thing ourselves.
- **Backend:** Directus + Postgres. Directus auto-generates the REST/GraphQL API and
  provides auth. The AI material-estimation step is the one piece Directus doesn't do
  natively — planned as a Directus custom endpoint/flow (or a small companion service)
  that calls the AI model. See [BACKEND.md](./BACKEND.md).
- **Frontend:** Expo / React Native + Expo Router (this repo). See [FRONTEND.md](./FRONTEND.md).
- The frontend talks to Directus only — it never calls the AI model directly.

## Phasing

- **Phase 1 (current): Frontend shell with placeholders.** Build all screens with
  hard-coded/static sample data. No backend calls, no data libraries yet. Goal: see
  what the app looks and feels like.
- **Phase 2:** Wire the frontend to Directus (SDK + data-fetching libraries).
- **Phase 3:** AI material estimation + photo estimation.

## Documentation map

- [PROJECT.md](./PROJECT.md) — this file; vision, flow, stack, phasing.
- [FRONTEND.md](./FRONTEND.md) — living status of the frontend.
- [BACKEND.md](./BACKEND.md) — living status of the backend (Directus + Postgres).
- [FUTURE.md](./FUTURE.md) — backlog of features to build once the groundwork is ready.
- [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md) — decisions needed to finish Phase 2 (auth) and start Phase 3.
- `docs/sessions/` — one file per session with a summary of what was done and decided.
- `docs/tasks/` — one file per major task with spec + progress:
  - [tasks/dimensions-input.md](./tasks/dimensions-input.md)
  - [tasks/ai-material-estimation.md](./tasks/ai-material-estimation.md)
  - [tasks/labour-rates.md](./tasks/labour-rates.md)
  - [tasks/photo-estimation.md](./tasks/photo-estimation.md)
  - [tasks/quote-generation.md](./tasks/quote-generation.md)

## Status

- [x] Project vision & stack decided
- [x] Documentation structure created
- [x] Phase 1: frontend placeholder shell — all five flow screens built (Dimensions, Photo, Materials, Labour, Summary), walking end-to-end (2026-06-29)
- [x] Phase 2: Directus integration — **closed 2026-09-24.**
  Backend live (Directus **11.13.4** + Postgres via Docker Compose; downgraded from 12 on
  2026-07-13 for free row-level permissions, see
  [directus-11-downgrade.md](./directus-11-downgrade.md)).
  All five wizard steps wired; quotes + line items persist; both quote lists read live data
  with server-enforced `$CURRENT_USER` scoping. **Auth end-to-end** (login, sign-up with
  contractor/homeowner profile, gate, logout, session-expiry redirect —
  [tasks/auth.md](./tasks/auth.md)). **Quotes are nameable, editable and deletable**
  (2026-07-27). Permission suite green at 55/55 with per-field and cross-user item-read
  coverage ([SECURITY.md](./SECURITY.md) §3.1).
  **Offline behaviour behind the gate closed 2026-08-16** (OQ #7): the fallbacks were
  verified on-device and a cold launch with no server now explains itself instead of
  showing a login form that can't succeed.
  **Server-side payload validation live 2026-09-24:** `quote-payload-validator`
  deployed to the devbox and the permission suite is green at **69/69** including
  Group G (SECURITY.md §2.5, §3.1). That was the last item holding the phase open.
  Email verification is **deferred by decision** (OQ #13) rather than blocking the phase;
  🚩 flagged as an end-of-build devbox step (maintainer, 2026-10-08).
  Quote editing, deletion and the flow-exit ✕ were **device-verified 2026-09-18**. The emptied v12 service on `:8055`
  is **staying up by decision (2026-08-16)**, so SECURITY.md §0 stays open rather than
  blocking the phase.
- [ ] Deferred: **branding pass** — app icon, splash, favicon, tab icon and `app.json`
  `slug`/`scheme` are all still Expo starter defaults
- [ ] Phase 3: AI estimation
