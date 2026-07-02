# Open questions

Decisions needed to finish Phase 2 (auth) and to start Phase 3 (AI estimation).
Recorded 2026-07-02, when Phase 2 sections 1–6 were done and only auth remained.
Answer them here (or in the session notes) as they're settled, then fold the
decisions into the relevant task docs.

---

## Phase 2 — Section 7: auth

1. **Account model — one shared company login, or a user per employee?**
   The app is per-company today. One shared "App User" account is simplest and fits
   the current Directus setup; per-employee users would let quotes show who created
   them (`user_created` is already stored) but means user management UI/process.

2. **Who creates accounts?** Sign-up inside the app, or accounts provisioned by hand
   in the Directus admin? (Admin-provisioned is far simpler and fine for a
   single-company launch; in-app sign-up is its own project.)

3. **Session lifetime & storage.** Directus issues access + refresh tokens. Proposal:
   store the refresh token in `expo-secure-store` and auto-refresh on launch, so the
   user logs in once and stays logged in. Any objection to indefinite sessions on a
   personal phone?

4. **What does logged-out look like?** A login screen gate in front of the whole app,
   or browse-freely-but-login-to-save? (Gate is simpler and matches a company tool.)

5. **How locked-down does Public get?** Plan: strip Public back to nothing (maybe
   keep `room_types` read for pre-login flows if we allow any). Everything moves to
   the App User role. Confirm nothing should stay public.

6. **User scoping of quotes.** Row-level `$CURRENT_USER` filters aren't available on
   this plan, so scoping lives in the frontend SDK query filter. With one shared
   company account this is moot (all quotes are "ours"); with per-employee users,
   decide whether everyone sees all company quotes (probably yes) or only their own.

7. **Offline behaviour once authed.** Today's offline fallbacks (static chips/rates,
   finish-without-saving) — keep as-is behind the login gate? (Recommended: yes,
   nothing changes below the gate.)

### Carried-over product questions from Phase 1/2 task docs

8. **Launch list of job/room types** (`dimensions-input.md`) — the 6 seeded types are
   provisional. What's the real launch list?
9. **One area per quote, or multiple surfaces** (e.g. walls + floor)?
10. **Single labour rate or multiple** (per trade / per job type)? (`labour-rates.md`)
11. **Margin/markup or tax on top of materials + labour?** (`quote-generation.md`)
12. **What does "show the customer" mean** — in-app screen only (today), PDF, or a
    shareable link?

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

- Labour = days × daily rate (USD). US launch, USD, ft-first units.
- Materials = 3 tiered packages (budget/standard/premium), itemized, area-grounded.
- No scraping — AI + retailer/affiliate APIs.
- Estimates cached in Postgres, ~7d TTL, `pricedAt` freshness stamp.
- Quotes save as `draft` unless the user marks them final.
- Frontend never calls the AI directly — always through Directus.
