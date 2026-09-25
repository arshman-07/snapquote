# Directus server-side code

Backend artifacts that run **on the devbox Directus instance**, not in the Expo app.
Kept in this repo (like `scripts/probe-permissions.sh`) so security-relevant server
code is reviewable and version-controlled rather than living only in the Directus
database or on the box.

## `extensions/quote-item-owner-guard`

A Directus **hook extension** that closes the open finding in `docs/SECURITY.md`
§2.2: an App User could `POST /items/quote_items` with another user's `quote` id
and attach line items to a quote they don't own. Directus create-time permission
filters can't traverse the M2O to `quote.user_created`, so the check runs here —
it loads the referenced quote **as the caller**, letting the existing read
scoping on `quotes` decide ownership. Registered on both
`quote_items.items.create` and `quote_items.items.update` (the latter blocks
re-parenting an item onto someone else's quote if Update is ever granted).

### No build step

`index.js` is hand-written ESM, and `directus:extension.path` points straight at
it. There is nothing to compile, no `npm install`, and no `dist/` — the file in
git is the file that runs. It imports nothing outside the extension context
Directus hands it, so it loads the same under Docker, bare Node, or pm2.

### Deployed

**Live since 2026-07-26** — the folder sits at `~/directus/extensions/` on the
devbox and is mounted into the `directus11` container via `docker-compose.yml`;
load confirmed in the container logs and the guard verified by the probe run
below (35 passed, 0 failed).

> The container copy is what runs. Editing the extension in this repo changes
> nothing until you copy it across and restart Directus again.

### Deploy

Copy the extension folder onto the devbox, into whatever directory Directus is
reading extensions from, then restart Directus.

**Docker Compose** — the host directory bound to `/directus/extensions`:

```yaml
services:
  directus:
    volumes:
      - ./extensions:/directus/extensions
```

```bash
# from the devbox, with the repo checked out or the folder scp'd across
cp -r directus/extensions/quote-item-owner-guard /path/to/stack/extensions/
docker compose restart directus
```

**Bare Node / pm2** — `EXTENSIONS_PATH` (defaults to `<project>/extensions`):

```bash
cp -r directus/extensions/quote-item-owner-guard "$EXTENSIONS_PATH/"
pm2 restart directus
```

### Confirm it loaded

Directus lists extensions at startup — check the logs for the extension name:

```bash
docker compose logs directus | grep -i extension   # or: pm2 logs directus --lines 100
```

If it failed to load, Directus logs the error and **the guard is not running**,
so treat a missing line as a failure, not a no-op. The probe below is the real
confirmation either way.

### Verify

Re-run the permission probes (`docs/SECURITY.md` §3.1):

```bash
BASE_URL=http://100.64.144.41:8056 \
  EMAIL_A=… PASS_A=… EMAIL_B=… PASS_B=… \
  bash scripts/probe-permissions.sh
```

Three rows matter:

- `POST item onto B's quote` — must flip from FAIL to **PASS** (403/404).
- `POST item with no quote` — must be **PASS** (403).
- `POST item onto own quote` — must stay **PASS** (200). This is the regression
  check: a guard that also blocks legitimate saves would break the app's
  `useSaveQuote`, and the deny probes alone wouldn't catch it.

---

## `extensions/quote-payload-validator`

A second **hook extension**, closing `docs/SECURITY.md` §2.5. The owner guard
answers *whose* rows you may touch; this one answers *what values* may go in
them. Client-side zod (`src/lib/quote-schema.ts`) runs in the app, so a raw API
client holding a valid App User token could still POST a quote with negative
totals, a 10 MB brief, a bogus `status`, or a length of 1e308.

Registered on `quotes.items.create/update` and `quote_items.items.create/update`.
It mirrors the app's own contract rather than inventing a stricter one:

| Rule | Detail |
|---|---|
| Dimension bounds | Copied from `BOUNDS` in `src/lib/quote-schema.ts`, unit-aware (ft vs m) |
| Enums | `unit`, `status`, `selected_tier`, `kind` |
| Money | `0 … 100,000,000` on every total and line amount |
| Totals agree | `grand_total == materials_total + labour_total`, ±0.01 |
| Text caps | `customer_name` 200, `job_type` 120, `material_zip` 20, `material_brief` 5000, `label` 300 |
| Required on create | `unit` and `job_type` only |

Two design rules are worth keeping in mind before changing it:

1. **Never reject what the app considers valid.** A validator that blocks real
   saves is a worse bug than the one it fixes — see the `customer_name` lesson
   in `docs/BACKEND.md`, where one missing field permission broke every save.
   This bit during development: an earlier draft also required `length`/`width`
   on create, which would have rejected the minimal rows
   `scripts/probe-permissions.sh` creates for its own setup.
2. **Only judge what you were sent.** Directus PATCHes are partial — the rename
   dialog sends `{customer_name}` alone — so every check is keyed on the field
   being present, and the totals cross-check runs only when all three arrive
   together.

Deliberately *not* enforced: `labour_days × labour_day_rate == labour_total`.
`getLabourTotal()` parses days with `parseFloat` while the payload stores
`parseInt`, so a fractional day would make that identity false for a perfectly
legitimate save.

### No build step

Same as the owner guard: hand-written ESM, `directus:extension.path` points
straight at `index.js`, nothing to compile and no npm install. It imports
nothing outside the extension context Directus hands it.

### Deploy

**Live since 2026-09-24** — deployed alongside the guard in
`~/directus/extensions/` on the devbox, load confirmed in the container logs, and
Group G green in the probe run (69 passed, 0 failed). To redeploy after an edit,
same procedure as the guard above:

```bash
cp -r directus/extensions/quote-payload-validator /path/to/stack/extensions/
docker compose restart directus     # or: pm2 restart directus
```

Then confirm it loaded — a missing line in the logs means the validator is
**not running**, so treat it as a failure rather than a no-op:

```bash
docker compose logs directus | grep -i quote-payload-validator
```

### Verify

Two layers, and both matter:

```bash
# 1. The rules themselves. No server, no network, no dependencies.
node scripts/test-payload-validator.mjs

# 2. The rules as actually enforced by the running server.
BASE_URL=http://100.64.144.41:8056 \
  EMAIL_A=… PASS_A=… EMAIL_B=… PASS_B=… \
  bash scripts/probe-permissions.sh
```

The unit tests run anywhere and cover 44 cases, weighted towards the payloads
that must still be **accepted**. `probe-permissions.sh` **Group G** is the live
check; its first two rows are the regression guard:

- `POST full valid wizard payload` and `POST minimal quote` — must be **200**.
  A guard that only ever denies would pass every deny row below and still break
  the app.
- The twelve deny rows — must be **400**. A **200** here means the extension
  didn't load, not that the rule is wrong.
