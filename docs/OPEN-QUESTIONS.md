# Open questions

Decisions needed to finish Phase 2 (auth) and to start Phase 3 (AI estimation).
Recorded 2026-07-02, when Phase 2 sections 1–6 were done and only auth remained.
Answer them here (or in the session notes) as they're settled, then fold the
decisions into the relevant task docs.

---

## Phase 2 — Section 7: auth

1. **Account model — one shared company login, or a user per employee?**
   ✅ **Answered 2026-07-13: per-user accounts.** The app now targets everyday
   homeowners as well as contractors (see PROJECT.md), so a shared company login
   is off the table. A **contractor / homeowner** choice at sign-up is stored on
   the profile and tailors the flow (labour step, quote wording).

2. **Who creates accounts?**
   ✅ **Answered 2026-07-13: in-app sign-up for everyone** (contractors and
   homeowners) via Directus public user registration into the App User role.
   No admin provisioning.

3. **Session lifetime & storage.** ✅ **Resolved by implementation, 2026-07-13 →
   2026-07-27.** Refresh token in `expo-secure-store` (localStorage on web), access
   token in memory only; auto-refresh on launch and proactively in-session; sessions
   are indefinite. A dead session bounces to login three ways: failed launch refresh,
   failed foreground re-validation, and a 401 on any authenticated request. The
   mid-session path was verified on-device 2026-07-27 (`SECURITY.md` §2.3).

4. **What does logged-out look like?** ✅ **Resolved 2026-07-13: a full gate.** The
   root layout gates `(tabs)`/`(quote)` behind a session via `Stack.Protected`; there
   is no browse-freely mode. Simpler, and it matches the per-user data model.

5. **How locked-down does Public get?** ✅ **Resolved 2026-07-25.** Public keeps
   **Read on `room_types` only**; everything else (labour_rates, quotes,
   quote_items) is App-User-only. The v11 rebuild was already at this shape (the
   v12 pre-auth widening was never carried over), and the maintainer confirmed
   room_types stays public rather than being pulled behind the gate.

6. **User scoping of quotes.** ✅ **Resolved 2026-07-13, verified 2026-07-21.**
   The requirement stands (with public sign-up, each account must only see its own
   quotes, and frontend SDK filters are not sufficient), and the downgrade to
   Directus 11 supplied the server-side enforcement: `$CURRENT_USER` row-level
   filters are free on v11 and applied to `quotes`/`quote_items`. An API probe
   with a fresh App User confirmed it reads only its own quotes. Note: the Read
   permission must also grant the individual fields — the v11 rebuild left that
   empty (and was missing the `date_created` column), which broke the recent-
   quotes list until both were fixed 2026-07-21. See `directus-11-downgrade.md`.

7. **Offline behaviour once authed.** ✅ **Answered 2026-08-16: keep the fallbacks
   as-is, and fix the gate above them.** All four below-the-gate fallbacks were
   verified on-device with Directus stopped — default room chips, default rate
   chips, the save-failure alert (Retry / Finish without saving) and its
   successful retry after reconnecting, and the quote lists' error note. Nothing
   below the gate needed changing.
   The gate *above* them was the real gap: a cold launch with no server put the
   user on a login form that cannot succeed offline, making every fallback
   unreachable from a cold start — the exact situation they exist for. Closed by
   the offline notice on the login screen (FRONTEND.md decisions log,
   SECURITY.md §2.3). **Not** solved: an offline cold start still can't reach the
   app, because there's no persisted query cache to show. That's offline-first
   mode — deliberately out of scope, see FUTURE.md.

### Carried-over product questions from Phase 1/2 task docs

8. **Launch list of job/room types** (`dimensions-input.md`) — the 6 seeded types are
   provisional. What's the real launch list?
9. **One area per quote, or multiple surfaces** (e.g. walls + floor)?
10. **Single labour rate or multiple** (per trade / per job type)? (`labour-rates.md`)
11. **Margin/markup or tax on top of materials + labour?** (`quote-generation.md`)
12. **What does "show the customer" mean** — in-app screen only (today), PDF, or a
    shareable link?

13. **Email verification at sign-up.** ✅ **Deferred 2026-09-18 — Phase 2 closes
    without it.** Directus public registration creates a usable account from any
    address, verified or not. Building it needs an SMTP transport configured on
    the devbox (`EMAIL_TRANSPORT`, `EMAIL_SMTP_*`) before a single line of app
    code is worth writing, and that is server setup rather than frontend work.
    Weighed against the alternative — holding Phase 2 open on an infrastructure
    task with no mail provider chosen — deferring was the call.
    **What this leaves open:** unverified and typo'd addresses can register, so
    account recovery and any future email to users are both unreliable. Revisit
    together with password reset, which needs the same transport, and with
    OPEN-QUESTIONS #12 if quotes ever become shareable by link.

---

## Phase 3 — AI material + photo estimation

### Architecture

1. **Where does the AI endpoint live?** Directus custom endpoint/extension, Directus
   Flow + webhook, or a small companion service (e.g. Node/Hono next to Directus in
   the same Compose file)? This was deferred in BACKEND.md; it's the first Phase 3
   decision because everything else hangs off it.
2. **Which AI model/provider**, and how does it do the price-grounding web-search /
   tool-use step? Budget per estimate matters: each quote fires 3 packages × N items.
3. **Retailer/affiliate API choice** — Home Depot / Lowe's via Impact, Amazon PA-API,
   or start with AI-estimated prices only (no live retailer link) and add affiliate
   links later? Affiliate approval processes take time — apply early if we want them
   at launch.

### Scope

3b. **Labour estimation for homeowners** (added 2026-07-13): the AI must also return
   a typical contractor labour cost (days and/or total) per job so homeowner users
   get a full project cost. Same call as materials, or separate? Feeds the response
   contract (#7). Numbered 3b to keep existing #4–11 references stable.
4. **Photo estimation MVP scope.** The Photo step is a placeholder. For launch: does
   the photo actually influence the estimate (vision model call), or is it attached
   to the quote for reference only? (Reference-only is a much smaller Phase 3.)
5. **Does the estimate use the job-type components idea** (`FUTURE.md`) — i.e. does
   Phase 3 wait for component checklists, or estimate whole-room from
   dimensions + brief first? (Recommended: whole-room first; components later refine it.)
6. **ZIP-based regional pricing** — real (retailer API takes ZIP) or cosmetic at
   launch? The field is already captured.

### Data & behaviour

7. **`materials` / `material_estimates` schema** — to be shaped by the final AI
   response contract (mock in `src/constants/materials-mock.ts` is the draft
   contract). Confirm the contract before creating collections.
8. **Cache key confirmation** — planned as `{ job type + ZIP + tier }` with ~7-day
   TTL. Does area belong in the key (est. quantities scale with area), or does the
   AI return per-unit quantities the app scales?
9. **Latency UX** — an AI estimate with web search can take 10–30s. Loading screen
   with progress? Generate the three tiers progressively? What does the Materials
   step show meanwhile?
10. **Failure fallback** — if the AI call fails, does the Materials step fall back to
    the current mock packages (clearly labelled), a manual-entry mode, or block?
11. **Cost controls** — per-day estimate caps or rate limiting per user? Self-hosted
    Directus + a paid AI API means runaway usage is a real bill.

---

## Already decided (don't reopen)

- **Audience = contractors + everyday homeowners** (2026-07-13). Contractor/homeowner
  choice at sign-up tailors the flow; in-app sign-up for all; per-user accounts.
- Labour: contractors enter days × daily rate (USD); homeowners get an
  **app-estimated typical labour cost** (Phase 3 AI, alongside materials).
- US launch, USD, ft-first units.
- Materials = 3 tiered packages (budget/standard/premium), itemized, area-grounded.
- No scraping — AI + retailer/affiliate APIs.
- Estimates cached in Postgres, ~7d TTL, `pricedAt` freshness stamp.
- Quotes save as `draft` unless the user marks them final.
- Frontend never calls the AI directly — always through Directus.
