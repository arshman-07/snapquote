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

- **API is HTTP, not HTTPS** — Directus at `http://192.168.1.116:8055` (LAN) /
  `http://100.64.144.41:8055` (Tailscale). Traffic is unencrypted; Tailscale
  encrypts the tunnel, the LAN address does not.
- **Public policy** — on v11 (2026-07-13): Read on `room_types` only. The legacy
  v12 instance at `:8055` was emptied the same day (its old public surface now
  returns FORBIDDEN); its container still runs with registration enabled —
  pending shutdown.
- **No auth in the app** — no login, no tokens, no user identity. The frontend
  now points at the v11 instance (`EXPO_PUBLIC_DIRECTUS_URL` = `:8056`,
  2026-07-13).
- **Row-level security now available (2026-07-13)** — after the downgrade to
  Directus 11, `$CURRENT_USER` item filters are free and applied: `quotes`
  Read/Update scoped to `user_created equals $CURRENT_USER`, `quote_items` via
  `quote.user_created`. Scoping is server-enforced, no longer advisory.
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

- 🔜 **Lock down the Public policy** once auth lands: strip create/read on
  `quotes`/`quote_items`; decide whether `room_types` read stays public
  (OPEN-QUESTIONS #5).
- 🔜 **App User role** as the only path to data: read reference collections,
  CRU on quotes/items. No delete unless we decide quotes are deletable in-app.
- ✅ **Server-side quote scoping** (required 2026-07-13, done same day): resolved
  by downgrading to Directus 11.13.4, where `$CURRENT_USER` row-level filters are
  free. `quotes` Read/Update scoped to `user_created equals $CURRENT_USER`
  (`user_created` is M2O → `directus_users` with On Create = "Save Current User
  ID"); `quote_items` scoped via the relational path `quote.user_created equals
  $CURRENT_USER`. Still to verify with a real registered user once auth lands.
- ❓ **Admin account hygiene** — strong unique password on the Directus admin,
  admin UI not exposed beyond LAN/Tailscale, static admin tokens avoided.

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
