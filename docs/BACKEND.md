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
| `labour_rates` | Company labour rates (priced as days × daily rate, USD) |
| `quotes` | A generated quote: dimensions, job type, totals, status, customer info |
| `quote_items` | Line items on a quote (material or labour), qty, unit price, subtotal |
| `jobs` / `room_types` | Reference list of job/room types the AI maps materials to |
| `material_estimates` | Cached AI/retailer lookups keyed by job type + ZIP + tier (TTL ~7d, `pricedAt`) |

> Schema is a first sketch — refine before building.

## API surface

- Directus auto-generates CRUD endpoints for the collections above.
- Frontend uses `@directus/sdk` to talk to these (Phase 2).

## AI material estimation

The one piece Directus does not do natively. Hosting options:

1. **Directus custom endpoint / extension** — an endpoint that takes dimensions (+ job
   type, brief, optional photo) and returns estimated materials + prices by calling the AI model.
2. **Directus Flow** — trigger-based, calls an external AI service via webhook.
3. **Companion microservice** — small separate service the frontend or Directus calls.

> Decision on hosting deferred to Phase 3. The frontend never calls the AI directly — it
> always goes through Directus.

### Approach (decided 2026-06-27)

- **Do NOT scrape retailer sites** — brittle, ToS-risky, gets blocked, and can't run from the
  phone. Instead: **AI (with a web-search / tool-use step) proposes the materials + tiers +
  explanations; a retailer/affiliate API (Home Depot/Lowe's via Impact, Amazon PA-API) attaches
  a real price + buy link.** Buy links become **affiliate links** (a revenue stream).
- **Three whole-job packages** — `budget` / `standard` / `premium` — each itemized, grounded in
  the captured floor area (e.g. "≈140 sq ft of tile"), not generic prices.

### Response contract

The endpoint returns the shape the frontend already renders (mirrored in
`src/constants/materials-mock.ts`). Per package: `tier`, `title`, `tagline`, `items[]`,
`subtotal`, `pricedAt`. Per item: `name`, `explanation`, `quantity`, `price`, `retailer`, `url`.

### Caching

- Cache estimates in Postgres keyed by `{ job type + region (ZIP) + tier }`.
- **TTL ~7 days** by default (prices drift slowly), **24–48h for volatile categories** (lumber/metal)
  later. Stamp each result with `pricedAt`; the app shows "est. as of <date>". A manual refresh
  busts the cache for that key.

## Self-hosting

- [x] Directus + Postgres running on spare Linux laptop (devbox), managed via pm2
- [x] Accessible over Tailscale (stable private IP, no public exposure)
- [ ] Environment/secrets handling (`.env` in place, formal secrets rotation TBD)
- [ ] Backup strategy for Postgres

### Devbox stack

The server also runs: Node, Git, pm2, MongoDB, Tailscale. Directus is the API layer;
pm2 keeps it alive across reboots.

## Decisions log

- **2026-06-06:** Backend is Directus + Postgres, self-hosted.
- **2026-06-06:** AI estimation runs server-side (Directus endpoint/flow or companion
  service), never from the frontend.
- **2026-06-27:** Materials = **3 tiered packages** (budget/standard/premium), itemized and grounded
  in floor area. **AI + web-search/affiliate APIs, not scraping.** Buy links are affiliate links.
- **2026-06-27:** Estimates cached in Postgres (`material_estimates`), **~7-day TTL** + `pricedAt`
  freshness + manual refresh. Frontend already renders this contract via a Phase-1 mock.
- **2026-06-29:** Phase 2 collections scoped to what the frontend actually wires up:
  `quotes`, `quote_items`, `room_types`, `labour_rates`. Deferred to Phase 3: `materials`,
  `material_estimates` (schema will be shaped by the AI estimation contract).

## Status

- [x] Phase 2: Directus + Postgres running on devbox (Tailscale)
- [x] Phase 2: collections defined + verified (`quotes`, `quote_items`, `room_types`, `labour_rates`); Public read on `room_types`
- [ ] Phase 2: frontend wired to Directus — foundation done (`@directus/sdk` client, TanStack Query provider); steps not wired yet
- [ ] Phase 3: AI material estimation endpoint
- [ ] Phase 3: `materials` + `material_estimates` collections
