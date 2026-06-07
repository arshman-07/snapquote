# Backend — Status

> Living status doc for the SnapQuote backend. Update as the API and AI integration land.

## Stack

- **Directus** — headless CMS / API layer. Auto-generates REST + GraphQL API, handles
  auth (tokens/refresh), roles & permissions, and an admin UI for managing data.
- **Postgres** — database behind Directus.
- **Self-hosted** — we run Directus + Postgres ourselves (likely via Docker Compose).

> Not built yet. This doc captures the plan; backend work begins in Phase 2.

## Data model (planned)

Directus collections (tables in Postgres):

| Collection | Purpose |
|---|---|
| `materials` | Material catalog: name, unit, unit price, category |
| `labour_rates` | Company labour rates (per hour / per job / per unit area) |
| `quotes` | A generated quote: dimensions, job type, totals, status, customer info |
| `quote_items` | Line items on a quote (material or labour), qty, unit price, subtotal |
| `jobs` / `room_types` | Reference list of job/room types the AI maps materials to |

> Schema is a first sketch — refine before building.

## API surface

- Directus auto-generates CRUD endpoints for the collections above.
- Frontend uses `@directus/sdk` to talk to these (Phase 2).

## AI material estimation

The one piece Directus does not do natively. Options:

1. **Directus custom endpoint / extension** — an endpoint that takes dimensions (+ job
   type, optional photo) and returns estimated materials + prices by calling the AI model.
2. **Directus Flow** — trigger-based, calls an external AI service via webhook.
3. **Companion microservice** — small separate service the frontend or Directus calls.

> Decision deferred to Phase 3. Model/provider not yet chosen. The frontend never calls
> the AI directly — it always goes through Directus.

## Self-hosting

- [ ] Docker Compose for Directus + Postgres
- [ ] Environment/secrets handling
- [ ] Backup strategy for Postgres

## Decisions log

- **2026-06-06:** Backend is Directus + Postgres, self-hosted.
- **2026-06-06:** AI estimation runs server-side (Directus endpoint/flow or companion
  service), never from the frontend.

## Status

- [ ] Phase 2: Directus + Postgres running locally
- [ ] Phase 2: collections defined
- [ ] Phase 3: AI material estimation endpoint
