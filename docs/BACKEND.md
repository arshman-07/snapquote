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
- [x] **Extensions deployed** (2026-07-26) — `quote-item-owner-guard` (the
      `quote_items` ownership guard) lives at `~/directus/extensions/` on the
      devbox, mounted into the `directus11` container via `docker-compose.yml`;
      load confirmed in the container logs. `quote-payload-validator` (server-side
      value checks on `quotes`/`quote_items`) joined it on **2026-09-24**, verified
      by probe Group G. Source + deploy steps:
      [`directus/README.md`](../directus/README.md). **Redeploy after editing
      the extension in this repo — the container copy is what runs.**

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
>
> **Two more gaps from the hand rebuild surfaced 2026-07-21** when the app first
> read quotes as an authenticated App User (recent-quotes list showed "couldn't
> load"): (1) `date_created` was never recreated — only `user_created` had been —
> so `sort=-date_created` 403'd with "field … does not exist"; (2) the App User
> **Read** policy on `quotes`/`quote_items` granted **no field-level access**, so
> reads returned only the primary key. Both fixed 2026-07-21 — `date_created`
> re-added as a Timestamp with the "Save Current Date/Time" special, and field
> read granted on all needed `quotes`/`quote_items` fields (incl. `date_created`,
> which is a system-managed field listed separately in the field-perms editor and
> was easy to miss). Row scoping (`user_created = $CURRENT_USER`) had been correct
> all along; the gaps were purely the missing column and empty field reads.

- `room_types` — id, sort, name (string, required). Seeded: Bedroom, Bathroom, Kitchen,
  Living Room, Flooring, Painting.
- `labour_rates` — id, daily_rate (float, required), currency (string, default USD).
  Seeded 2026-07-13: 300 / 450 / 600 USD (matches `LABOUR_RATE_PRESETS` in
  `src/constants/quote.ts`).
- `quotes` — id, date_created, user_created, **customer_name (string, nullable —
  ⚠️ see below)**, job_type (string), unit (string),
  material_brief (textarea), material_zip (string), length/width/height (float),
  selected_tier (dropdown: budget/standard/premium), materials_total/labour_total/grand_total
  (float), status (dropdown: draft/final, default draft — added 2026-07-02 after the frontend
  was already sending it; earlier rows backfilled to draft),
  **labour_days (integer, nullable) + labour_day_rate (float, nullable) — added
  2026-07-27**. The latter two store the *inputs* behind `labour_total`, which
  previously survived only inside a `quote_items` label string; without them the
  Labour step can't be rehydrated when a quote is reopened for editing.

  > ✅ **`customer_name` — added on the server and verified 2026-07-27.**
  > The app's free-text label for a quote (usually the customer or address),
  > deliberately separate from `job_type`, which stays a room-type reference.
  > Input/String, nullable. App User policy has it in the `quotes` **Read**,
  > **Create** and **Update** field lists. Pre-existing rows are `null`, which is
  > exactly the "unnamed" state the UI falls back from — no backfill was needed.
  >
  > **Lesson worth keeping — field permissions are per-operation allow-lists.**
  > Adding the field to Read only (which is what happened first) leaves the app
  > in a confusing half-broken state, and the failure modes are not proportional
  > to the mistake:
  > - missing from **Read** → the *entire* list query 403s, because Directus
  >   rejects the whole request over one unreadable field. Home and Quotes show
  >   their error state and no quotes appear at all.
  > - missing from **Create** → *every new quote save fails*, even when the user
  >   names nothing: `buildQuotePayload` always includes `customer_name` (`null`
  >   when blank) and Directus checks payload keys regardless of value.
  > - missing from **Update** → rename 403s.
  >
  > Directus returns the same message for "field doesn't exist" and "you can't
  > access it" (deliberately, to avoid leaking schema), and App Users can't read
  > `directus_fields`, so the two are indistinguishable from the client. To tell
  > them apart, probe a *known-good* field for the same operation on the same row
  > — e.g. `PATCH {"job_type": …}` succeeding while `PATCH {"customer_name": …}`
  > 403s isolates it to that field's Update list, and rules out the token, the
  > row filter and the permission cache in one shot.
- `quote_items` — id, kind (dropdown: material/labour), label (string), amount (float),
  quote (M2O → quotes; reverse O2M `quote_items` on quotes).
- `directus_users` (custom fields, **added on the server 2026-07-26**) — `user_type`
  (string, dropdown: `contractor` / `homeowner`, nullable), `full_name` (string,
  nullable), `company_name` (string, nullable). Set once at sign-up: homeowner →
  `full_name` (their name); contractor → `company_name` + `full_name` (owner's
  name). The frontend types these via `AppUserProfile` in `src/lib/directus.ts`
  and writes them with `updateMe` after registration.

### Access policies (rebuilt on v11, 2026-07-13)

- **Public** — Read on `room_types` only. (The temporary Phase-2 pre-auth widening
  from 2026-07-02 was not carried over to v11 — it survives only on the legacy v12
  instance until that is retired.)
- **App User** — Read on `room_types` + `labour_rates`; Create on `quotes` +
  `quote_items`; Read/Update on `quotes` scoped with a custom Item Permission filter
  **`user_created equals $CURRENT_USER`** — server-enforced row-level scoping.
  ✅ **`quote_items` Read scoping — bug found and fixed 2026-07-27.** It had been
  filtered on the item's **own `user_created`**, not the relational path
  `quote.user_created` that this doc claimed. Confidentiality was never broken
  (nobody could read another user's data), but the axis was wrong: items planted
  on your quote by someone else were invisible to you and visible to their
  creator — live residue from the pre-guard window. It also would have broken the
  edit flow, whose delete-then-recreate step can't remove items it can't see.
  **Now `quote` → `user_created` equals `$CURRENT_USER`, matching Delete.**
  Verified: A no longer sees items on B's quote; B now sees (and can delete) the
  items A planted there.
  ⚠️ Filter JSON must be **nested**, not flat — the nesting *is* the relation
  traversal:
  ```json
  { "quote": { "user_created": { "_eq": "$CURRENT_USER" } } }
  ```
- `quote_items` **Delete** — added 2026-07-27, same relational filter. Required
  by quote editing (replace the item set). Verified owner-scoped on a single
  row: `i6` was denied to A and allowed to B, its quote's owner. **The `quotes`/
  `quote_items` Read permissions must grant the individual fields, not just the
  row filter** — the rebuild originally left the field list empty, which broke the
  app's list queries until fixed 2026-07-21 (see the schema note above). The
  `quotes` **Update** field list was also missing `job_type` (users couldn't edit
  the job type on their own quote) — **added 2026-07-26**. The `quotes` Update
  permission now has a real client for the first time: `useUpdateQuote`
  (`src/hooks/use-update-quote.ts`) patches `customer_name` from the rename
  dialog. Row-level scoping is what authorises it — a PATCH against another
  user's quote id 403s on the `user_created = $CURRENT_USER` filter.
  ⚠️ **`quote_items` Create is NOT owner-scoped in permissions** — create-time
  rules can't traverse `quote.user_created`, so on permissions alone an App User
  could attach items to another user's quote. Enforced instead by the
  **`quote-item-owner-guard` hook extension** (`directus/extensions/`) —
  deployed to the devbox and verified 2026-07-26. Don't "simplify" the
  `quote_items` permissions expecting the UI to cover this; it can't. See
  SECURITY.md §2.2 / §2.2a and `directus/README.md`.
  **`directus_users` self-access (added 2026-07-26 for the sign-up profile):**
  Read + Update on `directus_users`, item filter **`id equals $CURRENT_USER`**,
  both **field-limited to `user_type`, `full_name`, `company_name`** (plus `id`
  on Read). Field-limiting the Update is what stops a user from editing anything
  else on their own record — verified by probe: `PATCH /users/me` on `role`,
  `email` and `password` all 403, while `full_name` and `user_type` succeed, and
  `GET /users` self-filters to the caller. The post-sign-up `updateMe` call now
  persists instead of 403ing (it was best-effort until this landed).
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

- **2026-07-27:** **Quote naming, editing and deletion — schema + permissions.** Added
  `quotes.customer_name` (free-text label, separate from `job_type`) and
  `quotes.labour_days` / `labour_day_rate` (the inputs behind `labour_total`, which had
  survived only inside a `quote_items` label string and so couldn't be rehydrated for
  editing). Added six missing fields to the `quotes` Update allow-list
  (`length`/`width`/`height`/`unit`/`material_brief`/`material_zip`), granted
  `quote_items` **Delete** (relational owner filter), and **fixed `quote_items` Read**,
  which had been scoped on the item's own `user_created` rather than
  `quote.user_created`. Also granted `quotes` **Delete** — initially by accident, then
  kept deliberately, reversing the earlier "no delete" position now that the app ships a
  delete affordance. All verified by probe; see SECURITY.md §2.2 / §3.1.
  **Lesson:** field permissions are *per-operation allow-lists*, and the failure modes are
  wildly disproportionate — a field missing from Read 403s the entire list query, and one
  missing from Create fails every save even when its value is null.

## Status

- [x] Phase 2: Directus + Postgres running on devbox (Tailscale)
- [x] Phase 2: collections defined + verified (`quotes`, `quote_items`, `room_types`, `labour_rates`); Public read on `room_types`
- [x] Phase 2: **downgraded to Directus 11.13.4** (port 8056, `directus11` DB); collections + policies rebuilt with server-enforced row-level scoping (2026-07-13)
- [x] Phase 2: auth end-to-end — registration, login, row-level quote scoping, permission lockdown; probe suite green (2026-07-21 → 07-27)
- [x] Phase 2: schema + permissions for quote naming, editing and deletion (2026-07-27)
- [x] Phase 2: frontend wired to Directus — all five steps, both quote lists, plus edit/delete
- [ ] ⚠️ **Phase 2 tail: stop the emptied v12 service on `:8055`** — still running with
      public registration enabled. Oldest outstanding item; closes SECURITY.md §0.
      (Done long ago: `labour_rates` seeded, frontend on v11 `:8056`, v12 data emptied.)
- [~] Phase 2 tail: email verification at sign-up — **deferred 2026-09-18, and
      Phase 2 closes without it** (OPEN-QUESTIONS #13). Needs an SMTP transport
      on the devbox before any of it can be built, which is server setup rather
      than app work. Unverified emails remain possible until it's revisited.
- [ ] Phase 2 tail: server-side payload/value validation (SECURITY.md §2.5) — the one
      unticked row in the §3.1 matrix; permissions cover *who touches what*, not *what
      values* they write
- [ ] Phase 3: AI material estimation endpoint
- [ ] Phase 3: `materials` + `material_estimates` collections
