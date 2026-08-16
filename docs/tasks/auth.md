# Task: Auth (Phase 2 — Section 7)

## Goal

Log the app in as a Directus "App User", retire the wide-open Public policy, and
scope quotes to the signed-in account. The last remaining Phase 2 section.

Related: `docs/OPEN-QUESTIONS.md` (Phase 2 §7, questions 1–7) and
`docs/SECURITY.md` (§2.2 API lockdown, §2.3 sessions — both blocked on this task).

## ✅ Server-side lockdown closed out (2026-07-26)

All three do-first items from the 2026-07-26 probing run are done, and the full
matrix passes — **35 passed, 0 failed, 0 skipped** with `RUN_PROFILE_PROBES=true`:

1. **`quote_items` ownership gap — closed.** Enforced by the
   `quote-item-owner-guard` hook extension (`directus/extensions/`, deployed to
   `~/directus/extensions/` on the devbox and mounted into the `directus11`
   container; load confirmed in the logs). It loads the referenced quote as the
   caller so the existing read scoping decides ownership, and guards
   `…items.update` too so re-parenting can't reopen it. Cross-user attach now
   403s; the own-quote attach path still works end-to-end. Decision + rejected
   alternatives in `SECURITY.md` §2.2a.
2. **`GET /users` self-filtering — confirmed.** 200 with a body containing only
   the caller; B's id absent from A's response.
3. **Sign-up profile backend — added.** `directus_users` gets `user_type` /
   `full_name` / `company_name` with self-scoped, field-limited Read + Update, so
   the post-sign-up `updateMe` persists instead of 403ing. Escalation via
   `PATCH /users/me` (role/email/password) stays 403.

**What's left on this task** (none of it blocks the app):

- ~~The **mid-session 401 → login** path is verified-by-code only.~~ **Closed
  2026-07-27 — verified on-device on the realistic path.** See the auto-refresh
  checklist item below.
- ~~Does an admin password change invalidate existing sessions?~~ **Opened and
  closed 2026-07-27: yes, it does.** A refresh token held across a Data Studio
  password change returned 401 `INVALID_CREDENTIALS` (vs a 200 baseline on an
  unchanged password). The earlier "password change didn't redirect" observation
  was an artefact of the default 15-minute `ACCESS_TOKEN_TTL`, not a surviving
  session. No compensating control needed — see `SECURITY.md` §2.3.
- Offline fallbacks behind the auth gate are untested (OQ #7).
- Email verification at sign-up is still an open question (needs a mail
  transport on the server).
- The emptied **v12 instance (8055) is still running** with registration enabled
  — stop the container to close out `SECURITY.md` §0.
- Payload/value validation (`SECURITY.md` §2.5) is the one unticked row in the
  §3.1 matrix: it covers *who* can touch *what*, not *what values* they write.

## Implementation options (surveyed 2026-07-03)

Ordered by fit for the current stack (self-hosted Directus 12, existing App User
role, `@directus/sdk` already in the app):

### Option 1 — Directus native email/password login ⭐ recommended

The SDK's built-in `authentication()` composable: `client.login(email, password)`
returns a short-lived access token (~15 min) plus a refresh token. Store the
refresh token in `expo-secure-store`, keep the access token in memory, and give
the SDK a custom storage adapter so refresh happens automatically.

- No new infrastructure; works with admin-provisioned accounts.
- Work is almost entirely frontend: login screen, an auth context/gate around the
  router, and swapping the SDK client from anonymous to authenticated mode.
- This is the path OPEN-QUESTIONS #3 already assumes.

### Option 2 — Static tokens (skip)

Assign a permanent static token to a Directus user; the app ships with (or asks
once for) the token — no login screen, no refresh logic. Rejected because the
token is irrevocable-in-practice once on devices, can't be rotated without
touching every phone, and a token-entry screen is barely simpler than a login
form. Stopgap at best.

### Option 3 — Directus SSO (Google/Apple) — later, not first

Directus supports OAuth2/OpenID providers; Expo has `expo-auth-session` for the
redirect flow. But native redirects against self-hosted Directus over HTTP on a
LAN address are fiddly (redirect URIs, deep links, Apple/Google expect HTTPS).
Makes sense later as a layer on top of option 1.

### Option 4 — External auth service (Clerk / Supabase Auth / Auth0) — rejected

Their JWTs don't map to Directus permissions out of the box — would need a
custom hook/endpoint to bridge them to Directus users. Real backend work for no
benefit at this scale.

## Proposed shape (option 1, updated 2026-07-13 for the public-audience decision)

The app now serves **everyday homeowners as well as contractors** (PROJECT.md),
which resolved OQ #1/#2 and reshaped this task:

- **Full login gate** in front of the whole app (redirect in the root layout or
  an `(auth)` route group when there's no session) — simpler than
  browse-freely-but-login-to-save (OQ #4).
- **In-app sign-up for everyone** (OQ #2) via Directus public user registration
  (`REGISTER_*` / users register endpoint) into the App User role. Login and
  registration screens live in the same `(auth)` group.
- **Contractor / homeowner choice at sign-up** (OQ #1), stored on the user
  profile (e.g. a `user_type` field), tailoring the flow later: contractors keep
  the days × daily-rate Labour step; homeowners get an app-estimated typical
  labour cost (Phase 3).
- **Refresh token in `expo-secure-store`**, auto-refresh on launch; failed
  refresh → login screen (OQ #3).
- ⚠️ **Blocker to resolve first — server-side quote scoping (OQ #6).** With
  strangers signing up, frontend-only scoping is not acceptable: any authenticated
  user could read all quotes. Re-verify on the live Directus 12 whether
  `$CURRENT_USER` row-level permission filters actually work before building
  anything; if truly unavailable, design a compensating control
  (SECURITY.md §2.2).

## Checklist (once approach is approved)

- [ ] **Pre-work:** re-test `$CURRENT_USER` row-level filters on the live
      Directus 12 (create a test user, set `read` on `quotes` with
      `user_created = $CURRENT_USER`, probe with two accounts)
- [~] Enable Directus public registration into the App User role — **done
      2026-07-21** (verified against v11 by API: `/users/register` → 204, then
      login succeeds and the app lands signed-in). The `user_type`
      (contractor/homeowner) field on users is still pending — deferred together
      with the sign-up type selector.
- [x] Auth context + gate (2026-07-13: `src/context/auth.tsx` —
      restoring/signedIn/signedOut, restore-on-launch via `directus.refresh()`
      (skipped when no stored token), signIn/signOut clear the query cache;
      root layout gates `(tabs)`/`(quote)` vs `(auth)` with `Stack.Protected`.
      Failed launch-refresh clears the stored token only on server rejection,
      not network failure. Verified on web: cold start and protected deep link
      both land on /login; garbage token triggers one /auth/refresh then login.
      ⚠️ App is login-gated with a placeholder screen until the next step lands.)
- [x] Login screen (2026-07-13: real email/password form — RHF + zod
      (`src/lib/auth-schema.ts`), inline validation, submit spinner, server
      errors mapped: `INVALID_CREDENTIALS` → "Email or password is incorrect.",
      network failure → connection message. Verified against live Directus
      (401 path); success path confirmed by the maintainer signing in from the
      app on-device, 2026-07-13.)
- [x] Sign-up screen (2026-07-21: **email + password built and verified
      on-device** — maintainer confirmed sign-up + sign-in both work end-to-end
      against v11 after public registration was enabled.) Details:
      `src/app/(auth)/sign-up.tsx`. RHF + zod (`registerSchema` in
      `auth-schema.ts`: 8-char minimum + confirm-password match; server stays
      the final judge). Shared field chrome extracted to
      `src/components/auth-field.tsx` (`AuthField` + `AuthErrorColor`), reused by
      login. Flow: `signUp` in the auth context calls `registerUser` then
      `login` — the register endpoint returns no session — clears the query
      cache, flips the gate. Errors mapped: post-register `INVALID_CREDENTIALS`
      → "email may already be registered" (Directus 204s on an existing email to
      prevent enumeration, so the follow-up login is where it surfaces);
      `FORBIDDEN` → "sign-up isn't available right now"; network → connection
      message. Login footer's "coming soon" note replaced with a real link;
      sign-up links back to login. ⚠️ **Needs Directus public registration
      enabled on v11 → App User**, else the register call 403s.)
- [~] Sign-up profile (account type + names) — **frontend built 2026-07-26,
      backend pending.** The contractor/homeowner choice (deferred 2026-07-21) is
      now collected at sign-up along with a name, and a company name for
      contractors. Reuses one `full_name` for "the person" (homeowner's name /
      contractor's owner name); `company_name` is contractor-only.
      • Schema: `AppUserProfile` added to `src/lib/directus.ts` (declares the
        custom `directus_users` fields so `updateMe` is typed).
      • Validation: `registerSchema` now uses a `superRefine` with type-dependent
        rules (`userType` required; `fullName` required with a label-appropriate
        message; `companyName` required only for contractors).
      • UI (`sign-up.tsx`): a two-option segmented selector (Contractor /
        Homeowner) drives which fields render — contractor sees Company name +
        Company owner's name, homeowner sees Your name.
      • Flow: `signUp` now takes a `SignUpInput` object and, after login, writes
        the profile via `updateMe` — **best-effort** (a failure just `console.warn`s
        and the user is still signed in; the profile isn't saved). All fields for
        the chosen path are required client-side.
      • ⚠️ **Backend pending (on the server):** add the `user_type` / `full_name`
        / `company_name` fields to `directus_users` and grant App User self
        Read+Update field-limited to them with filter `id = $CURRENT_USER` — see
        BACKEND.md "Access policies". Until then `updateMe` 403s (caught).
- [x] Logout (2026-07-13: "Sign out" button in the Home header → auth context
      `signOut` → `directus.logout()` + clears SecureStore + query cache → gate
      returns to /login. Verified end-to-end on web: after sign out lands on
      /login and the stored refresh token is null. ⚠️ Web-only: the fixed top
      tab bar overlaps the Home header, so the button sits behind it on web —
      fine on native (bottom tab bar + top safe-area inset). Revisit if web
      becomes a real target, or move logout to a future Account screen.)
- [x] SDK client: `authentication()` mode with SecureStore-backed storage adapter
      (2026-07-13: `src/lib/auth-storage.ts` — refresh token in SecureStore
      (localStorage on web), access token memory-only; client in `directus.ts` is
      `authentication('json', …) + rest()`. Verified: anonymous requests carry no
      Authorization header, garbage persisted token doesn't break launch. Note:
      the SDK does NOT auto-refresh from a cold start (no `expires_at`) — the
      auth context must call `directus.refresh()` on launch.)
- [x] Auto-refresh on launch; 401 → back to login (2026-07-25). Launch/in-session
      refresh was already in place — `AuthProvider.restore()` calls
      `directus.refresh()` on cold start, and the SDK client runs `autoRefresh:
      true` for proactive in-session renewal. This step added the missing
      **mid-session dead-session → login** path (option A, immediate sign-out):
      `src/lib/query.ts` now wires a global `QueryCache`/`MutationCache`
      `onError` through `isAuthError` (Directus SDK v23 codes `TOKEN_EXPIRED` /
      `INVALID_TOKEN` / `INVALID_CREDENTIALS`, or a raw 401) to a module-level
      `setSessionExpiredHandler`; the auth context registers `signOut` on that
      handler while `status === 'signedIn'` only (restore owns its own refresh
      failures; signedOut has nowhere to go). Login/sign-up requests go through
      `directus.request` directly, so their credential errors never trip it —
      only authenticated data hooks do. Bounce is automatic via the existing
      `status`-driven gate.
      **Verification (2026-07-26):** the launch/relaunch logout path is confirmed
      on-device — after the account was deleted server-side, quitting and
      reopening the app lands on `/login` (`restore()` → `directus.refresh()` →
      401 → token cleared → signedOut). The **mid-session** handler is verified by
      SDK-source inspection (v23 throws `RequestError` with `.response.status` +
      `.errors[].extensions.code`, exactly what `isAuthError` matches) but was not
      reproducible on-device by revoking the session: Directus access tokens are
      **stateless JWTs**, so neither a password change nor deleting the user
      yields an immediate 401 — the token keeps authenticating until its
      ~15-min TTL expires (deleting the user just made the scoped quotes query
      return an empty 200, no error). A genuine mid-session 401 only occurs on
      access-token expiry with a failed refresh; to exercise it deliberately,
      temporarily lower `ACCESS_TOKEN_TTL` on the server.
      **✅ Verified on-device 2026-07-27 — PASS.** Recipe: `ACCESS_TOKEN_TTL=60s`
      on `directus11` (via `docker compose up -d`, not `restart` — `restart` does
      not re-read env), sign in on-device, delete the user's row from
      `directus_sessions` in Postgres (kills the refresh token but leaves the
      account intact), keep the app **foregrounded** ~70s, then pull-to-refresh
      the Home recent-quotes list → bounced to `/login`. TTL has since been
      restored to the default and the override line removed from
      `docker-compose.yml`.
      • Foregrounding matters: the `AppState` re-validation below fires on
        `inactive → active`, not just `background → active`, so on iOS even the
        notification shade or app switcher would sign you out via the *other*
        path and invalidate the test. `src/lib/query.ts` logs
        `[auth] session expired mid-session → signing out` under `__DEV__` so the
        two paths are distinguishable.
      • **Mechanism — corrected 2026-07-27.** The 401 does *not* come from the
        failed refresh propagating. Per `@directus/sdk@23.0.0`
        (`dist/auth/composable.js`): `getToken()` is
        `await refreshIfExpired().catch(() => {})`, so a refresh rejection is
        swallowed outright, and `refresh()` only rewrites storage *after* a
        successful `POST /auth/refresh` — on failure the **expired access token
        stays in storage**. `rest()` then sends it anyway, and Directus answers
        401 `TOKEN_EXPIRED`. `isAuthError` matches on both the raw 401 status and
        the code, so it catches this either way. Practical consequence: the
        bounce is **reactive** — it needs the app to actually issue a request, so
        a user idling on a screen with no query activity stays put until
        something fetches.
      **Foreground refresh (2026-07-26):** to catch a revoked session promptly
      instead of waiting out the token TTL, the auth context also re-validates on
      `AppState` → `active` (background/inactive → active): it calls
      `directus.refresh()` and signs out on a server rejection (dead refresh
      token); a network failure leaves the session in place. Runs only while
      signedIn. This also makes the revoke test reproducible without touching the
      server TTL: delete/suspend the account, then background and reopen the app →
      lands on `/login`.
- [x] Move all permissions to the App User role; strip Public back to nothing
      (2026-07-25). Public keeps **Read on `room_types` only** (OQ #5 resolved —
      stays public); labour_rates + quotes/quote_items are App-User-only. The v11
      rebuild was already at this shape; the maintainer confirmed and finalized
      it. See SECURITY.md §2.2 and BACKEND.md "Access policies".
- [x] User scoping of quotes — server-side row-level filters
      (`user_created = $CURRENT_USER`) live on v11 since 2026-07-13. Verified via
      API 2026-07-21: a fresh App User reads only its own quotes. Wiring the app
      to read quotes as an authenticated user surfaced two v11 rebuild gaps
      (empty field-read perms on `quotes`/`quote_items`, and a missing
      `date_created` column) that broke the recent-quotes list; both fixed
      2026-07-21 — see `directus-11-downgrade.md` and BACKEND.md.
- [ ] Verify offline fallbacks still work behind the gate (OQ #7)
- [x] Run the permission-probing checklist (SECURITY.md §3.1) after lockdown,
      including cross-user probing (user A must not read user B's quotes).
      **Closed 2026-07-26: full run with `RUN_PROFILE_PROBES=true` — 35 passed,
      0 failed, 0 skipped.**
      **Runner built 2026-07-26:** `scripts/probe-permissions.sh` automates the
      Group A–D matrix (unauthenticated surface, own-data CRU, cross-user +
      privilege denials incl. escalation via `PATCH /users/me`, garbage token)
      plus a content assertion that B's quote never appears in A's list. Group E
      (`/users/me` profile writes) is gated behind `RUN_PROFILE_PROBES=true` for
      after the `directus_users` backend step.
      **Run 2026-07-26** against v11 with two registered test users: most probes
      pass — unauthenticated access blocked everywhere, cross-user quote
      read/update/delete denied, system endpoints (roles/policies/permissions)
      inaccessible, self-escalation via `PATCH /users/me` (role/email/password)
      blocked, garbage token rejected, and quote-list isolation confirmed (B's
      quote absent from A's list). Two items surfaced:
      • **Fixed:** `quotes` Update was missing `job_type` in its field permissions.
      • **✅ `quote_items` create isn't owner-scoped — closed same day:** an App
        User could POST a `quote_item` onto another user's quote (200, expected
        403/404) because Directus create rules can't traverse
        `quote.user_created`. Fixed by the `quote-item-owner-guard` hook
        extension (SECURITY.md §2.2a, `directus/README.md`), deployed and
        re-probed. The probe gained two rows for it: a "no quote" deny and a
        "POST item onto own quote" 200 regression check — both PASS.
      • **✅ Confirmed:** `GET /users` returns 200 (self-filtered) not 403, and
        the body contains only the caller (probe asserts B's id is absent).
      **Re-run 2026-07-26 after the fixes, with `RUN_PROFILE_PROBES=true` once the
      `directus_users` profile fields landed: 35 passed, 0 failed, 0 skipped.**

## Open questions

- ~~Logout in v1?~~ → Yes, done (2026-07-13): "Sign out" in the Home header.
  May move to a dedicated Account screen later.
- Email verification on sign-up — Directus registration supports it, but it
  needs a mail transport configured on the server. Launch without it?

## Status

- [~] In progress — options surveyed 2026-07-03. 2026-07-13: audience widened to
      homeowners; OQ #1/#2 resolved (per-user accounts, in-app sign-up,
      contractor/homeowner type at sign-up); authenticated SDK client +
      SecureStore adapter, auth context + gate, login screen, and logout all
      done. **2026-07-21:** email/password **sign-up screen built and verified
      on-device**; **public registration enabled** on v11 → App User; row-level
      quote scoping verified by API; and the two v11 rebuild gaps that broke the
      recent-quotes list (empty field-read perms + missing `date_created`) found
      and fixed. The auth flow — sign-up, sign-in, gated app, scoped quotes — now
      works end-to-end against v11. **2026-07-25:** the mid-session
      401 → login path landed (see the auto-refresh checklist item); the
      Public-policy lockdown is done and OQ #5 resolved (Public keeps
      `room_types` read only). **2026-07-26:** launch/relaunch logout confirmed
      on-device (deleted account → relaunch → `/login`); the mid-session 401
      handler is verified-by-code but its realistic path (token-expiry + failed
      refresh) is untested on-device because a stateless JWT can't be forced to
      401 by server-side revocation — lower `ACCESS_TOKEN_TTL` to exercise it.
      **2026-07-27:** that last gap is closed — the mid-session 401 → login
      bounce is **verified on-device (PASS)** at `ACCESS_TOKEN_TTL=60s` with the
      session row deleted from `directus_sessions`; TTL restored afterwards. The
      SDK mechanism behind it was corrected in the checklist item above (stale
      expired token re-sent → 401, not a propagated refresh error).
      **2026-08-16:** offline behaviour behind the gate closed out (OQ #7). All
      four below-the-gate fallbacks verified on-device with Directus stopped, and
      the gate above them fixed: a launch refresh that fails for **network**
      reasons now keeps the refresh token and flags `offlineSession`, so the
      login screen offers a one-tap **Try again** instead of a password form that
      cannot succeed. A server rejection still discards the token and shows the
      plain form. Mechanism and the confirmed SDK behaviour in SECURITY.md §2.3.
      **Remaining for the task:** decide email verification (needs a mail
      transport) and payload/value validation (SECURITY.md §2.5). Stopping the
      emptied v12 service was **deferred by the maintainer on 2026-08-16** — it
      stays running for now; SECURITY.md §0 remains open. Session invalidation on
      password change was checked 2026-07-27 and needs no work (SECURITY.md §2.3).
