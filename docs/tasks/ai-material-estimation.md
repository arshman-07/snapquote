# Task: AI Material Estimation

## Goal

Given the job dimensions (and optionally a photo), use AI to determine the material types
needed and their prices, producing a rough material subtotal.

## Scope

- Input: dimensions + job/room type (from [dimensions-input](./dimensions-input.md)), a free-text
  brief, an optional ZIP, and optionally a photo (from [photo-estimation](./photo-estimation.md)).
- Output: **three itemized whole-job packages** — budget / standard / premium. Each line: name,
  explanation, quantity, price, retailer + buy link. Each package has a subtotal + `pricedAt`.
- Runs **server-side** via Directus (endpoint/flow) or a companion service — never from
  the frontend.
- **Added 2026-07-13:** the estimate must also cover **typical contractor labour cost**
  for homeowner users (audience widened to everyday homeowners — see PROJECT.md).
  Contractors keep entering their own days × rate; homeowners get the AI's labour
  figure instead. Same call or separate is open (OPEN-QUESTIONS Phase 3 §3b) and
  feeds the response contract.

## Approach (decided 2026-06-27)

- **Good/better/best**: three packages, not one list. The selected tier's subtotal feeds the quote.
- **AI + web-search/affiliate APIs, NOT scraping** — AI proposes materials/tiers/explanations; a
  retailer API attaches real price + (affiliate) buy link. Cache in Postgres, ~7-day TTL + `pricedAt`.
  See [BACKEND.md](../BACKEND.md).
- Quantities are **grounded in floor area** (e.g. "≈140 sq ft of tile"), not generic.

### Known Phase-1 gap to fix here (noted 2026-07-13)

The Phase-1 mock is **not job-type-aware and ignores height entirely.**
`getArea` (`src/context/quote-draft.tsx`) is always floor area (length × width);
`buildMaterialPackages` receives `jobType` but never reads it, and prices paint
off floor area ÷ 350. So a **painting** job doesn't factor in the walls — height
is captured/validated/saved but never enters any calculation, and the total is
identical to flooring. Phase 3 must make the estimate **job-type-aware**: wall
jobs (painting) price off **wall area ≈ 2 × (length + width) × height** (+ ceiling
where relevant), floor jobs off floor area. This also implies height becomes
**required** for wall-based job types (optional today in `quote-schema.ts`).
Deferred to Phase 3 by the maintainer rather than patched into the mock.

## Phase 1 (placeholders)

- [x] Materials screen: brief + ZIP inputs, "Get options" with a simulated loading round-trip.
- [x] Three selectable package cards (items, explanations, buy links, subtotal, freshness date).
- [x] Selected tier's subtotal flows into the quote total (`getMaterialsTotal`).
- [x] Mock (`src/constants/materials-mock.ts`) is shaped to the eventual server response, so the
      screen won't change when wired to Directus.

## Implementation options (surveyed 2026-07-03)

Organized by the three decisions Phase 3 hangs on (`docs/OPEN-QUESTIONS.md` Phase 3
§1–3). Model pricing below is current as of the survey date.

### Decision 1 — Where the AI endpoint lives

- **A. Directus endpoint extension ⭐ recommended.** Custom Node endpoint inside
  Directus (e.g. `POST /ai/estimate`). Shares Directus auth (the endpoint checks the
  caller's token for free once Phase 2 auth lands) and runs in the existing container —
  no new service. Constraint: written in Directus's extension framework, fine for one
  endpoint.
- **B. Directus Flow + webhook — rejected.** Low-code, but a 10–30s AI call with real
  logic (cache lookup, tier assembly, validation) is awkward in Flows.
- **C. Companion service (Node/Hono) in the same docker-compose — later, if ever.**
  Maximum freedom, but must validate Directus tokens itself and adds a second service
  to run/monitor. Where we'd land if the AI layer grows into its own product.

### Decision 2 — Model + price grounding

Shape of the call: **one Claude API request per estimate** using the server-side
**web search tool** (Claude searches current material prices itself — no scraping) and
**structured outputs** (JSON schema matching the `materials-mock.ts` contract, so the
frontend swap is trivial). One call returns **all three tiers** — search results and
room context are shared across tiers, cheaper and more consistent than 3 calls.

Model options (per-million-token pricing at survey date):

| Model | Pricing (in/out) | Fit |
|---|---|---|
| **Claude Opus 4.8** ⭐ | $5 / $25 | Default recommendation — strongest at multi-step search-and-synthesize. Rough cost ~**$0.10–0.15 per estimate** (≈5K in / 4K out, all 3 tiers) + small per-search fee. |
| Claude Sonnet 5 | $3 / $15 ($2/$10 intro to Aug 2026) | Near-Opus on this task at ~⅓ cost — option if volume gets high (user's call). |
| Haiku 4.5 | $1 / $5 | Skip — price research + quantity math wants the reasoning quality. |

Grounding options (orthogonal to model):

- **AI + web search only ⭐ start here.** Fresh enough for a rough quote; zero external
  approvals.
- **Retailer/affiliate APIs** (Home Depot/Lowe's via Impact, Amazon PA-API) — exact
  SKUs, real prices, affiliate revenue, but approval takes weeks. **Apply now** if
  wanted at launch; layer on top of web search later. (Refines the 2026-06-27
  "retailer API prices them" decision into a sequencing: web-search-grounded first,
  retailer links as the upgrade.)
- **AI-estimated only, no search** — cheapest/fastest (~cents, ~5s) but prices drift.
  Use as the fallback when search fails, not the primary.

### Decision 3 — Cost control

- **Postgres result cache** keyed `{job type, ZIP, tier}`, ~7-day TTL (already
  decided) is the dominant lever: first quote for a job-type+ZIP pays ~$0.10–0.30,
  every other quote that week pays nothing. At launch scale the AI bill is likely
  dollars/month.
- Per-user rate limiting (OQ #11) is protection against a stolen token, not normal
  usage.
- Anthropic prompt caching adds marginal savings if calls cluster; the result cache
  does the heavy lifting.

### Recommended stack

Directus endpoint extension + Claude Opus 4.8 with web search + JSON-schema output
matching the mock contract + Postgres result cache + mock packages as the clearly
labelled fallback on AI failure. Retailer/affiliate APIs deferred (apply early).

## Later (Phase 3)

- [ ] Choose AI model/provider; decide integration shape (endpoint vs Flow vs microservice).
- [ ] Wire retailer/affiliate price + buy-link lookup; implement the Postgres cache + TTL.
- [ ] Refresh-busts-cache; per-category TTLs for volatile materials.

## Open questions

- ~~Where do material unit prices come from?~~ → AI proposes items, retailer/affiliate API prices them.
- How do we handle AI uncertainty / let the user swap a single line within a package?

## Status

- [x] Phase 1 UI built on a mock matching the server contract. Phase 3 backend not started.
- [ ] Implementation options surveyed 2026-07-03 (see above) — awaiting approach approval.
