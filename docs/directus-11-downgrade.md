# Directus 12 → 11: Row-Level Permissions Options

> Written 2026-07-13. Goal: proper auth + row-level (item rule) permissions on the
> self-hosted devbox instance without paying for a license.

## Why

Directus 12 moved to the **MSCL license**. On the unlicensed self-hosted "core tier":

- **Custom access rules (row-level / item-rule permissions) are gated** behind a license
- SSO is gated
- Limits: 3 seats, 5 flows

Directus 11 uses the older **BSL license** — no feature gating at all. Full policies
system (row-level item rules, field-level permissions), email/password auth, static
tokens, and SSO/OIDC all work out of the box. Free self-hosting under $5M revenue,
no registration or activation.

Note: the policies/row-level system landed in **v11.0**, so use the **latest 11.x**
(not specifically 11.1.1) — same features, more bug fixes.

## Option A — Stay on 12 + Open Innovation Grant

Directus offers a free grant for orgs under $5M revenue and <50 employees:

- 5 instance activations, unlocks everything (custom access rules, SSO, etc.)
- Zero migration work

Trade-offs:

- Requires registration; instance activates against a license (phone-home)
- Annual renewal with eligibility reviews — backend depends on the grant staying valid

## Option B — Downgrade to Directus 11 (chosen path if avoiding license machinery)

**Important:** this is a rebuild, not an in-place downgrade. Directus migrations only
run forward — v11 cannot boot against a v12 database. The v11 instance gets a fresh
database; we carry over the schema definition and seed data, not the v12 DB itself.
Effort is small at current project stage (~1–2 hours, minimal real data).

Nothing in use is v12-specific (audited 2026-07-13): 4 collections + REST CRUD,
roles/policies, email/password auth with refresh tokens, `/users/register`, and the
SDK surface (`createDirectus`/`rest`/`authentication('json')`, `readItems`,
`createItem(s)`). No Flows, no extensions, no files. All identical in v11.

### Runbook (Docker Compose on the devbox)

0. **Capture from v12 while it runs:**
   - `docker compose exec directus npx directus schema snapshot ./snapshot.yaml`
     (field-by-field reference even if it won't apply to v11)
   - Export `room_types` + `labour_rates` seed data (Data Studio CSV export, or
     `GET /items/<collection>?limit=-1`). Test quotes optional.
   - Note `.env` values: `KEY`, `SECRET`, DB creds, CORS.
1. **New empty database** in the existing Postgres container (e.g. `directus11`).
   Leave the v12 DB untouched until cutover is verified.
2. **Run v11 alongside:** add a compose service pinned to the newest 11.x image tag
   (check Docker Hub — `latest` is 12). Point `DB_DATABASE` at the new DB, set
   `ADMIN_EMAIL`/`ADMIN_PASSWORD` (image bootstraps an empty DB), run on port 8056.
3. **Recreate schema:** try `npx directus schema apply ./snapshot.yaml` in the v11
   container; if it rejects the newer-version snapshot, recreate the 4 collections by
   hand in Data Studio from the snapshot (~20 min).
4. **Rebuild access control properly (the payoff):**
   - App User policy: Create on `quotes`/`quote_items`; Read/Update/Delete with item
     rule `user_created = $CURRENT_USER`. Read-all on `labour_rates`/`room_types`.
     `directus_users`: Read/Update with item rule `id = $CURRENT_USER` **and** field
     permissions excluding `role`/`policies` — closes the SECURITY.md escalation hole.
   - Public policy: nothing (or bare minimum for pre-login).
   - Enable public registration (Settings → User Registration) → App User role.
5. **Reimport seed data** (`room_types`, `labour_rates`) via Data Studio CSV import.
6. **Frontend:** update `EXPO_PUBLIC_DIRECTUS_URL` in `mobile/.env` if the port
   changed. Smoke-test login, cold-start `refresh()`, `readItems`, `createItem(s)`.
   `@directus/sdk@^23` should work against v11; pin an older major if not.
7. **Verify, then cut over:** register a fresh test user — sees only own quotes;
   `PATCH /users/<admin-id>` returns **403** (was a 500/attempted write on v12);
   can't read other users. Then move v11 to 8055, remove the v12 service, keep the
   v12 DB/volume for a couple of weeks as fallback.

Things that would make this harder (none currently apply): lots of production data,
Flows, custom extensions built against v12's extension SDK, files/assets to migrate.

Caveat: v11 is the older line and will stop getting fixes sooner than 12.

## Migration status (2026-07-13) — v11 live, running alongside v12

Executed Option B. Done:

- **Directus 11.13.4** running on port **8056**, using a separate Postgres database
  (`directus11`) in the same Postgres container. v12 stays untouched on port 8055
  with the `snapquote` database as fallback.
- Schema snapshot from v12 **failed to apply** on v11 — crashed on a system field
  diff (`directus_oauth_clients.date_created`). All 4 collections (`room_types`,
  `labour_rates`, `quotes`, `quote_items`) rebuilt by hand with the same fields.
- `room_types` reseeded with the same 6 values (Bedroom, Bathroom, Kitchen,
  Living Room, Flooring, Painting). `labour_rates` remains unseeded.
- `quotes.user_created` added manually (M2O → `directus_users`, On Create =
  "Save Current User ID") — it wasn't included when the collection was rebuilt
  by hand.
- **Access policies rebuilt:**
  - Public: Read on `room_types` only.
  - App User: Read on `room_types` + `labour_rates`; Create on `quotes` +
    `quote_items`; Read/Update on `quotes` with custom Item Permission filter
    `user_created equals $CURRENT_USER` — **the row-level filter that was
    paywalled on v12 works on v11 at no cost.**
  - `quote_items` scoped via the relational path `quote.user_created equals
    $CURRENT_USER` (no own `user_created` field needed).

Remaining:

- Auth work: enable public registration → App User role; decide `directus_users`
  self-scoping (Read/Update with `id = $CURRENT_USER`, `role`/`policies` fields
  excluded) — currently App User has no `directus_users` access at all on v11.
- Run the step-7 verification checklist with a real registered user.
- **Stop the v12 service.** Its data was emptied on 2026-07-13 (nothing left,
  no fallback value), which neutralized the SECURITY.md data exposure — but its
  `/users/register` endpoint is **still enabled** (verified by API probe), so the
  empty instance remains a pointless foothold until the container is stopped.
  Optionally move v11 to port 8055 afterward and update `EXPO_PUBLIC_DIRECTUS_URL`.

Done since:

- ~~Seed `labour_rates`~~ — done 2026-07-13 (matching the app's fallback presets:
  300 / 450 / 600 USD daily rates).
- ~~Frontend points at v12~~ — done 2026-07-13: `EXPO_PUBLIC_DIRECTUS_URL`
  switched to `:8056` (v11).
- ~~v12 fallback data~~ — v12 emptied 2026-07-13; public reads on its old
  collections now return FORBIDDEN (verified by API probe).

## Sources

- [Everything v12: Upgrades, New Features, and MSCL License — Directus Community](https://community.directus.com/t/everything-v12-upgrades-new-features-and-mscl-license/2237)
- [Directus Licensing Overview](https://directus.com/docs/licensing/overview)
- [Directus v12 License Change](https://directus.com/resources/directus-v12-license-change)
- [Directus v11 Release Notes (policies system)](https://directus.io/blog/v11-release-notes)
