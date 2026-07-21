# Backend — Status

> Living status doc for the SnapQuote backend. Update as the API and AI integration land.

## Stack

- **Directus 11.13.4** — headless CMS / API layer. Auto-generates REST + GraphQL API, handles
  auth (tokens/refresh), roles & permissions, and an admin UI for managing data.
  (Downgraded from 12 on 2026-07-13 for free row-level permissions — see
  [directus-11-downgrade.md](./directus-11-downgrade.md).)
- **Postgres** — database behind Directus.
- **Self-hosted** — we run Directus + Postgres ourselves via Docker Compose.

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

- [x] Directus + Postgres running on spare Linux laptop (devbox) via Docker Compose
- [x] Directus **11.13.4 on port 8056** (`directus11` database) is the live instance;
      legacy **v12 on port 8055** was emptied on 2026-07-13 (no fallback data left) —
      service still running, pending shutdown
- [x] Accessible over Tailscale (stable private IP, no public exposure)
- [ ] Environment/secrets handling (`.env` in place, formal secrets rotation TBD)
- [ ] Backup strategy for Postgres

### Devbox stack

The server also runs: Node, Git, pm2, MongoDB, Tailscale. Directus is the API layer;
pm2 keeps it alive across reboots.

## Schema as built (2026-07-02; rebuilt by hand on v11 2026-07-13)

> The v12 schema snapshot failed to apply on v11 (crashed on a system field diff,
> `directus_oauth_clients.date_created`), so all 4 collections were rebuilt by hand
> with the same fields. `room_types` reseeded with the same 6 values;
> `labour_rates` seeded 2026-07-13 with the app's preset rates (300/450/600 USD).
> `quotes.user_created` was added manually (M2O → `directus_users`, On Create =
> "Save Current User ID") since the hand rebuild didn't include it.

- `room_types` — id, sort, name (string, required). Seeded: Bedroom, Bathroom, Kitchen,
  Living Room, Flooring, Painting.
- `labour_rates` — id, daily_rate (float, required), currency (string, default USD).
  Seeded 2026-07-13: 300 / 450 / 600 USD (matches `LABOUR_RATE_PRESETS` in
  `src/constants/quote.ts`).
- `quotes` — id, date_created, user_created, job_type (string), unit (string),
  material_brief (textarea), material_zip (string), length/width/height (float),
  selected_tier (dropdown: budget/standard/premium), materials_total/labour_total/grand_total
  (float), status (dropdown: draft/final, default draft — added 2026-07-02 after the frontend
  was already sending it; earlier rows backfilled to draft).
- `quote_items` — id, kind (dropdown: material/labour), label (string), amount (float),
  quote (M2O → quotes; reverse O2M `quote_items` on quotes).

### Access policies (rebuilt on v11, 2026-07-13)

- **Public** — Read on `room_types` only. (The temporary Phase-2 pre-auth widening
  from 2026-07-02 was not carried over to v11 — it survives only on the legacy v12
  instance until that is retired.)
- **App User** — Read on `room_types` + `labour_rates`; Create on `quotes` +
  `quote_items`; Read/Update on `quotes` scoped with a custom Item Permission filter
  **`user_created equals $CURRENT_USER`** — server-enforced row-level scoping.
  `quote_items` scoped via the relational path **`quote.user_created equals
  $CURRENT_USER`** rather than its own `user_created` field. No `directus_users`
  access (self-scoped Read/Update to be added when auth lands).
- ✅ **Row-level filters now work at no cost** — they were paywalled on self-hosted
  Directus 12 (the reason for the downgrade); on v11 they are free. Frontend-side
  user scoping is no longer the enforcement mechanism.

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
- **2026-07-13:** **Downgraded Directus 12 → 11.13.4** because v12's MSCL core tier
  paywalls custom/row-level permission filters. Fresh rebuild on port 8056 with a
  separate `directus11` database (v12 kept on 8055 as fallback); collections rebuilt
  by hand after the schema snapshot failed to apply; policies rebuilt with
  server-enforced `$CURRENT_USER` scoping on `quotes` (and `quote.user_created` on
  `quote_items`). Details in [directus-11-downgrade.md](./directus-11-downgrade.md).

## Status

- [x] Phase 2: Directus + Postgres running on devbox (Tailscale)
- [x] Phase 2: collections defined + verified (`quotes`, `quote_items`, `room_types`, `labour_rates`); Public read on `room_types`
- [x] Phase 2: **downgraded to Directus 11.13.4** (port 8056, `directus11` DB); collections + policies rebuilt with server-enforced row-level scoping (2026-07-13)
- [ ] Phase 2: post-downgrade tail — verify with a registered user; stop the (now empty) v12 service. Done: `labour_rates` seeded; frontend `EXPO_PUBLIC_DIRECTUS_URL` on v11 (`:8056`); v12 data emptied (all 2026-07-13)
- [ ] Phase 2: frontend wired to Directus — foundation done (`@directus/sdk` client, TanStack Query provider); steps not wired yet
- [ ] Phase 3: AI material estimation endpoint
- [ ] Phase 3: `materials` + `material_estimates` collections
