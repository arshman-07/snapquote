# Security measures & testing

Living document for SnapQuote's security posture: what's at risk, what we do about
it, and how we verify it. Created 2026-07-03, while Phase 2 section 7 (auth) is
still open — several items below are blocked on those decisions
(`docs/OPEN-QUESTIONS.md`).

Status legend: ✅ in place · 🔜 planned/agreed · ❓ needs discussion

---

## 1. Current exposure (honest snapshot)

The starting point, so we know what we're fixing:

- **API is HTTP, not HTTPS** — Directus at `http://192.168.1.116:8055` (LAN) /
  `http://100.64.144.41:8055` (Tailscale). Traffic is unencrypted; Tailscale
  encrypts the tunnel, the LAN address does not.
- **Public policy is wide open (temporary)** — unauthenticated read on
  `room_types` + `labour_rates`, unauthenticated **create + read on `quotes` +
  `quote_items`**. Anyone who can reach the API can read every quote and insert
  arbitrary rows.
- **No auth in the app** — no login, no tokens, no user identity.
- **No row-level security available** — `$CURRENT_USER` filters aren't available
  on this Directus 12 plan; user scoping can only live in frontend query filters,
  which are advisory (any API client can ignore them).
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
- 🔜 **Server-side quote scoping is now mandatory** (2026-07-13): the app is
  opening to public homeowner sign-ups, so "any authenticated user can read all
  quotes" is no longer acceptable. First step: re-verify on the live Directus 12
  whether `$CURRENT_USER` row-level permission filters actually work (the earlier
  finding that they're unavailable predates this requirement and must be
  re-tested). If truly unavailable, design a compensating control (e.g. a Directus
  flow/hook or companion endpoint that injects the user filter server-side).
  Blocks the auth task (`docs/tasks/auth.md`).
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
