# Security measures & testing

Living document for SnapQuote's security posture: what's at risk, what we do about
it, and how we verify it. Created 2026-07-03, while Phase 2 section 7 (auth) is
still open — several items below are blocked on those decisions
(`docs/OPEN-QUESTIONS.md`).

Status legend: ✅ in place · 🔜 planned/agreed · ❓ needs discussion

---

## 0. 🚨 CRITICAL — live account-takeover hole (found 2026-07-13)

> **Update (2026-07-13, later the same day): migrated to Directus 11.13.4 — the
> hole does not exist on the new live instance.** On v11 (port 8056) the App User
> policy has **no `directus_users` access at all**, and `quotes`/`quote_items` are
> server-scoped with `$CURRENT_USER` item filters (free on v11's BSL license — the
> paywall that caused the "All Access" workaround is gone). See
> `directus-11-downgrade.md`. **Second update (same day): the v12 instance was
> emptied entirely** — nothing left in it; public reads on its old collections
> return FORBIDDEN (verified by API probe). That removes the data exposure. Two
> residuals until the v12 container is stopped: its `/users/register` endpoint is
> **still enabled** (verified — probe with invalid payload returned a validation
> error, not 403), so the empty instance remains a registerable foothold; and it
> was not verified whether the probe users / admin `first_name` were part of the
> wipe.
>
> **Third update (2026-07-21): public registration is now _intentionally_ enabled
> on v11** as the app's in-app sign-up path (into the App User role). This is safe
> on v11 precisely because the App User policy has **no `directus_users` access** —
> the registration + All-Access-on-users combination that made it a hole on v12
> does not exist here. Sign-up and sign-in verified on-device the same day.

**Status: fixed on the live v11 instance (8056); v12 (8055) emptied of all data
but still running with registration enabled — stop the container to close it
out.** Discovered by API probing while scoping the sign-up screen. Two settings
combined into a full compromise:

1. **Public registration is enabled** — `POST /users/register` (204) lets anyone
   on the network create an App User account, no approval.
2. **The App User policy has Read + Update on `directus_users` with "All Access"
   (no row filter)** — because "Use Custom" (row-level filters) is paywalled on
   this Directus plan, the field was left as All Access.

Proven with two throwaway users (`probe-a@example.com`, `probe-b@example.com`,
password `ProbeTest123!` — **delete these**):

- A freshly-registered user **read every user record**, including the admin's
  email (`rajaarshman12@gmail.com`) and, critically, the admin's **role UUID**
  (`c8b669ae-40b8-44e4-b79e-a18d270ca12c`).
- That user **modified another user's record** (set `probe-b.first_name`, then
  reverted it) and **modified the admin's record** (changed the admin
  `first_name` to `PROBE_TEST` — ⚠️ original value not captured; **admin should
  reset their own first name in the UI**).
- Self role-escalation to `admin` returned 500, **not 403** — i.e. the write was
  *attempted*, not permission-denied; it only failed because the literal string
  `"admin"` isn't a valid role UUID. Since the user can read the real admin role
  UUID (above) and Update on `role` isn't blocked, **full privilege escalation to
  admin is near-certain.** Not executed — doing so would leave a live admin
  backdoor with a known password. `directus_roles` itself is 403 to App User, but
  that doesn't help: the UUID leaks through the readable user record.

**This cannot be fixed in the frontend.** Frontend SDK filters are advisory; an
attacker uses `curl`, not our app.

**The proper fix may be unlocked for free (verified 2026-07-13):** the reason
row-level filters are unavailable is that we're on Directus's free **Core** tier,
which gates custom/`$CURRENT_USER` permission filters (and SSO) behind paid
**Team**/Enterprise. Directus's **Open Innovation Grant** (orgs under $5M
revenue, <50 employees) grants fully permissive access at no software cost — if
eligible, that turns the items below from "impossible on our plan" into "just
configure the filter." Pursue the grant / tier decision first; it changes the
whole remediation from workaround to real row-level security. See
`docs/questions-for-senior-dev.md`.

Required server-side remediation regardless (do the lockdown now; the grant
enables the clean version):

- **Immediately:** on the App User policy, remove Update on `directus_users`
  (or at minimum strip every field except `first_name`/`last_name`/`user_type`
  from Update — field-level permissions appear to be available even though row
  filters aren't; **verify `role`/`status`/`password`/`token`/`provider` are NOT
  updatable**). Reduce Read to the minimum fields, ideally disable it.
- **Delete the two probe users** and any unknown registrations.
- **Reconsider whether public registration should be on at all** until the above
  is locked down (it is the entry point that makes this reachable).

**Design consequence for sign-up (blocks `docs/tasks/auth.md` §sign-up):** the
planned "register → PATCH my own `directus_users.user_type`" flow depends on the
exact Update permission that is dangerous here, and on this plan we can't scope
that Update to "own record only." So storing `user_type` on the user record via
the client is not viable as-is. Options to decide (see auth.md): a server-side
Directus Flow/hook that sets `user_type` (no client write permission needed); a
separate collection with create-own semantics (same row-filter limitation —
probably no better); or drop the field and carry contractor/homeowner per-quote
or in app state. **Needs a decision before the sign-up screen is built.**

---

## 1. Current exposure (honest snapshot)

The starting point, so we know what we're fixing:

- **API is HTTP, not HTTPS** — live v11 Directus at `http://192.168.1.116:8056`
  (LAN) / `http://100.64.144.41:8056` (Tailscale). Traffic is unencrypted;
  Tailscale encrypts the tunnel, the LAN address does not.
- **Public policy** — on v11: Read on `room_types` only. The legacy v12 instance
  at `:8055` was emptied 2026-07-13 (its old public surface now returns
  FORBIDDEN); its container still runs with registration enabled — pending
  shutdown.
- **Auth in the app (2026-07-21)** — email/password login **and sign-up** with a
  full login gate; refresh token in SecureStore, per-user sessions. Public
  registration into the App User role is enabled on v11 (intentional — see §0).
  Frontend points at v11 (`EXPO_PUBLIC_DIRECTUS_URL` = `:8056`).
- **Row-level security in force (2026-07-13, verified 2026-07-21)** — after the
  downgrade to Directus 11, `$CURRENT_USER` item filters are free and applied:
  `quotes` Read/Update scoped to `user_created equals $CURRENT_USER`,
  `quote_items` via `quote.user_created`. Server-enforced, not advisory; an API
  probe with a fresh App User confirmed it reads only its own quotes. (Wiring the
  app also exposed two v11-rebuild gaps — empty field-read perms and a missing
  `date_created` column — both fixed 2026-07-21; see `directus-11-downgrade.md`.)
- **No rate limiting / cost controls** — relevant once Phase 3 AI estimation
  exists (paid API per estimate).

---

## 2. Measures

### 2.1 Transport

- ❓ **HTTPS for the Directus API.** Options: Caddy/Traefik reverse proxy with a
  real cert (needs a domain), Tailscale-only access with `tailscale cert`, or
  accept HTTP on a trusted network for now. Decide before shipping to anyone
  else's phone.
- ❓ **Should the LAN address be retired** in favour of Tailscale-only, so the
  API is never reachable from an untrusted network?

### 2.2 API access control (Directus)

- ✅ **Public policy** — on the v11 rebuild it was already minimal: Read on
  `room_types` only, no `quotes`/`quote_items` access (the v12 pre-auth widening
  was never carried over). Decision closed 2026-07-25 (OPEN-QUESTIONS #5):
  `room_types` read **stays public**; everything else is App-User-only.
- 🔜 **App User role** as the only path to data: read reference collections,
  CRU on quotes/items. No delete unless we decide quotes are deletable in-app.
- ✅ **Server-side quote scoping** (required 2026-07-13, done same day): resolved
  by downgrading to Directus 11.13.4, where `$CURRENT_USER` row-level filters are
  free. `quotes` Read/Update scoped to `user_created equals $CURRENT_USER`
  (`user_created` is M2O → `directus_users` with On Create = "Save Current User
  ID"); `quote_items` scoped via the relational path `quote.user_created equals
  $CURRENT_USER`. **Verified 2026-07-21** by API with a freshly registered App
  User — reads only its own quotes. (The App User Read permission must also grant
  the individual fields, not just the row filter; the rebuild left that empty and
  broke the app's list queries until fixed 2026-07-21.)
- ❌ **OPEN — `quote_items` create isn't owner-scoped (found 2026-07-26 by
  `scripts/probe-permissions.sh`).** An authenticated App User can `POST
  /items/quote_items` with `quote` set to **another user's** quote id and it
  succeeds (200), attaching fabricated line items to a quote they don't own — an
  integrity/tampering hole, though not a read leak (cross-user *reads* of quotes
  and items are correctly denied). Root cause: Directus create-time Field
  Validation / permission filters only see fields on the incoming payload and
  **can't traverse the M2O** to `quote.user_created`, so a same-collection rule
  can't express "the referenced quote must be mine." (A rule on the item's own
  `user_created` wouldn't help anyway — the attacker's item legitimately has
  *their* id; the check must be on the *quote's* owner. The `user_created` preset
  possibly populating after validation is a secondary red herring.) **Fix
  required before wider launch — options in §2.2a below.** Read-side scoping means
  the victim would see the bogus items on their own quote.
- ❓ **`GET /users` returns 200 for an App User (needs body confirmation).** The
  list endpoint responds 200 rather than 403; this is expected Directus behaviour
  *if* the self-scoped Read Item Permission (`id = $CURRENT_USER`) filters the
  body to only the caller's own record. Confirm by inspecting the response body:
  it must contain only the caller and no other users. (The probe script now
  asserts B's id is absent from A's `/users` response.)
- ✅ **`quotes` update field coverage** — fixed 2026-07-26: `job_type` was missing
  from the `quotes` Update allowed Field Permissions, so users couldn't edit it on
  their own quotes; added.
- ❓ **Admin account hygiene** — strong unique password on the Directus admin,
  admin UI not exposed beyond LAN/Tailscale, static admin tokens avoided.

#### 2.2a Compensating control for `quote_items` create scoping (planned)

The check must load the referenced quote and confirm its `user_created` matches
the caller, which needs relation access at write time. Candidate approaches:

- **Directus Flow — Filter (blocking) on `quote_items.items.create`.** No-code,
  lives in the admin. Reads the referenced quote(s), compares `user_created` to
  the trigger's accountability user, and rejects otherwise. Must handle the
  **batch** payload the app sends (`createItems`) and the array shape, and needs a
  Read-Data step (the sandboxed Run-Script op has no DB access).
- **Custom hook extension — `filter('quote_items.items.create', …)`.** Uses the
  `ItemsService` to load the quote and throw a `ForbiddenError` on mismatch.
  Robust, handles batch cleanly, but is a code extension to build and deploy into
  the Directus container.
- **Nested-only creation.** Stop the app creating items via a standalone
  `POST /items/quote_items` and instead nest them under the quote create/update
  (O2M), so the quote's own owner-scope governs. Reduces the standalone attack
  surface but Directus still checks `quote_items` create permission on nested
  items, so it's a defence-in-depth measure, not a complete fix on its own —
  pair it with one of the above. This one also touches the frontend
  (`useSaveQuote`).

### 2.3 Authentication & session handling (Phase 2 §7)

- 🔜 **Directus email/password login** for the App User role; account model and
  provisioning per OPEN-QUESTIONS #1–2.
- 🔜 **Token storage:** refresh token in `expo-secure-store` (Keychain/Keystore),
  access token in memory only. Never AsyncStorage, never logged.
- 🔜 **Auto-refresh on launch**; failed refresh → back to the login gate.
- ❓ **Session lifetime** — indefinite (refresh forever) vs. forced re-login after
  N days. OPEN-QUESTIONS #3 proposes indefinite on a personal phone.
- ❓ **Logout** — required for v1? (Clears secure store + query cache.)

### 2.4 Secrets & configuration

- 🔜 **No secrets in the repo.** API URLs are fine in config; tokens, admin
  credentials, and (Phase 3) AI/retailer API keys are not. `EXPO_PUBLIC_*` env
  vars ship inside the app bundle — treat them as public.
- 🔜 **AI/retailer API keys live server-side only** (Directus/companion service).
  Already decided: the frontend never calls the AI directly.
- ❓ **`.env` convention** — add `.env` + `.env.example`, gitignore the former?

### 2.5 Input validation & data integrity

- ✅ **Client-side validation** via RHF + zod (`src/lib/quote-schema.ts`) with
  unit-aware bounds.
- ❓ **Server-side validation** — client zod is UX, not security. Directus field
  validation rules on `quotes`/`quote_items` (numeric ranges, required fields,
  max lengths on free text) so a raw API client can't insert garbage.
- ❓ **Displayed-data hygiene** — quote briefs / customer names are free text
  that comes back and renders in the app (and later maybe in a PDF/shareable
  link — OPEN-QUESTIONS #12, where injection starts to matter).

### 2.6 Abuse & cost controls (Phase 3)

- ❓ **Rate limiting on the AI estimation endpoint** — per-user/per-day caps
  (OPEN-QUESTIONS #11). A stolen token shouldn't be able to run up the AI bill.
- ❓ **Directus rate limiting** (`RATE_LIMITER_*` env) on the API generally.

### 2.7 Device & app-level

- ❓ **Photos** (Phase 3) — stored where, and are uploads size/type-restricted?
- ❓ **Anything sensitive in logs?** Convention: never log tokens, credentials,
  or full quote payloads in production builds.

---

## 3. Security testing

How we verify the measures above. No test suite exists yet; these start as
manual checklists and graduate to automation where it pays.

### 3.1 Manual API probing (curl / Bruno / Postman)

Automated by **`scripts/probe-permissions.sh`** (Git Bash + curl). It logs in as
two App Users A and B, then runs the matrix below and prints PASS/FAIL vs the
expected HTTP status, ending with a tally (non-zero exit on any failure). Re-run
after each permissions change:

```bash
BASE_URL=http://100.64.144.41:8056 \
  EMAIL_A=a@example.com PASS_A=… EMAIL_B=b@example.com PASS_B=… \
  bash scripts/probe-permissions.sh
```

Set `RUN_PROFILE_PROBES=true` once the `directus_users` profile fields + App User
self Read/Update permissions exist, so the run also verifies those. The script
carries no credentials (env-var driven; placeholder defaults only).

Run against the live API after each permissions change:

- [ ] Unauthenticated request to every collection — confirm only the intended
      public surface responds (after lockdown: expect 401/403 on quotes).
- [ ] Unauthenticated create on `quotes`/`quote_items` — expect rejection.
- [ ] Authenticated App User: confirm CRU works on own data, and that
      privileged operations (delete, other collections, user admin) are denied.
- [ ] Expired/garbage token — expect 401, and the app returns to login rather
      than crashing or silently showing stale data.
- [ ] Oversized / out-of-range / wrong-type payloads direct to the API — verify
      server-side validation once added (§2.5).

### 3.2 Secret & dependency hygiene (automatable now)

- [ ] `git log -p | grep`-style scan (or `gitleaks`) for committed secrets —
      candidate for a pre-commit hook or CI step.
- [ ] `npm audit` on dependencies — decide a cadence and a severity threshold.
- [ ] Verify no `EXPO_PUBLIC_*` var contains anything secret.

### 3.3 App-side checks

- [ ] Refresh token is in SecureStore, not AsyncStorage (inspect device /
      simulator storage).
- [ ] Logout (if built) clears secure store and the TanStack Query cache.
- [ ] App behaves sanely when the API is unreachable (existing offline
      fallbacks) and when it returns 401/403/500.

### 3.4 Later / bigger guns

- ❓ Automated integration tests for the permission matrix (a script that runs
  §3.1 and fails loudly) — worth it once auth stabilises.
- ❓ Directus + Postgres backup/restore test — availability is part of security.
- ❓ Anything store-review-driven (privacy policy, data deletion) before an
  actual App Store / Play launch.

---

## 4. Decisions log

Settled security decisions get recorded here (date + decision), and folded into
the sections above.

- 2026-07-03 — Document created; nothing decided yet beyond what Phase 2/3
  planning already fixed (tokens in `expo-secure-store`; AI keys server-side;
  frontend never calls AI directly).
- 2026-07-13 — App opens to public homeowner sign-ups (PROJECT.md). Consequences:
  per-user accounts with in-app registration; server-side quote scoping becomes a
  hard requirement (§2.2); HTTPS (§2.1) moves from "decide eventually" to
  "required before public users" — a public app cannot ship pointing at plain
  HTTP on a LAN/Tailscale address.
- 2026-07-13 — **Downgraded to Directus 11.13.4** (port 8056, separate DB) instead
  of paying for / grant-licensing v12's row-level filters. Server-side quote
  scoping is now in place (§2.2); §0's hole doesn't exist on v11 (App User has no
  `directus_users` access) but stays live on the legacy v12 instance at `:8055`
  until v12 is retired.
