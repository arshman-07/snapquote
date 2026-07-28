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
