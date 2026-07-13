# Task: Auth (Phase 2 — Section 7)

## Goal

Log the app in as a Directus "App User", retire the wide-open Public policy, and
scope quotes to the signed-in account. The last remaining Phase 2 section.

Related: `docs/OPEN-QUESTIONS.md` (Phase 2 §7, questions 1–7) and
`docs/SECURITY.md` (§2.2 API lockdown, §2.3 sessions — both blocked on this task).

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
- [ ] Enable Directus public registration into the App User role; add a
      `user_type` (contractor/homeowner) field on users
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
- [ ] Sign-up screen with contractor/homeowner choice (needs Directus public
      registration enabled + `user_type` field — see checklist item above)
- [x] SDK client: `authentication()` mode with SecureStore-backed storage adapter
      (2026-07-13: `src/lib/auth-storage.ts` — refresh token in SecureStore
      (localStorage on web), access token memory-only; client in `directus.ts` is
      `authentication('json', …) + rest()`. Verified: anonymous requests carry no
      Authorization header, garbage persisted token doesn't break launch. Note:
      the SDK does NOT auto-refresh from a cold start (no `expires_at`) — the
      auth context must call `directus.refresh()` on launch.)
- [ ] Auto-refresh on launch; 401 → back to login
- [ ] Move all permissions to the App User role; strip Public back to nothing
      (decide whether `room_types` read stays public — OQ #5)
- [ ] User scoping of quotes — server-side (row-level filters if the pre-work
      confirms them, else compensating control; see SECURITY.md §2.2). SDK query
      filters on top for correctness of what's displayed.
- [ ] Verify offline fallbacks still work behind the gate (OQ #7)
- [ ] Run the permission-probing checklist (SECURITY.md §3.1) after lockdown,
      including cross-user probing (user A must not read user B's quotes)

## Open questions

- Logout in v1? (Clears SecureStore + query cache — SECURITY.md §2.3.) With
  public per-user accounts, almost certainly yes.
- Email verification on sign-up — Directus registration supports it, but it
  needs a mail transport configured on the server. Launch without it?

## Status

- [~] In progress — options surveyed 2026-07-03. 2026-07-13: audience widened to
      homeowners; OQ #1/#2 resolved (per-user accounts, in-app sign-up,
      contractor/homeowner type at sign-up); step 1 done (authenticated SDK
      client + SecureStore storage adapter). Next: auth context + gate (step 2),
      then login screen. Row-level filter re-test before the lockdown step.
