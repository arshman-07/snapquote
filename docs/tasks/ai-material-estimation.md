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

## Response contract — v1 (approved for now by the maintainer, 2026-10-08)

Answers OPEN-QUESTIONS #7. Builds on the 2026-10-08 decisions (#1–#11, BACKEND.md
"Estimation architecture" and "Estimation model & price grounding"). It **extends** the
`materials-mock.ts` shape: every existing field keeps its name and meaning, so the
package cards keep rendering. New fields are additive.

### 1. Request: what the app sends

`POST /items/estimate_requests`:

```ts
type EstimateRequestInput = {
  job_type: string;            // room_types name, e.g. "Bathroom"
  length: number;
  width: number;
  height: number | null;       // required for wall-based jobs (see §5)
  unit: 'ft' | 'm';
  brief: string;               // free text, may be ''
  zip: string;                 // local-price search hint (#6), may be ''
  photos: string[];            // 0–3 Directus file ids (#4); [] = dimensions-only
};
```

### 2. The row: what the app polls

`GET /items/estimate_requests/:id`. Users read only their own rows and can never write
anything below `photos`.

```ts
type EstimateRequestRow = EstimateRequestInput & {
  id: string;
  status: 'pending' | 'done' | 'failed';   // 'done' = every tier settled (done or failed)
  result: EstimateResult | null;          // filled in progressively (#9)
  error: string | null;                   // whole-request failure, user-safe wording
  attempts: number;                       // sweeper retries (#1)
  // Server-only bookkeeping (cost log for #11 and the launch-model test):
  model: string;
  tokens_in: number;
  tokens_out: number;
  searches: number;
  date_created: string;
  user_created: string;
};
```

### 3. The result

```ts
type EstimateResult = {
  contractVersion: 1;
  hasPhotos: boolean;          // false → UI marks the estimate "less accurate" (#4)
  photoNotes: string | null;   // what the AI saw: condition, existing materials, prep needs
  tiers: Record<MaterialTier, TierSlot>;
  labour: LabourEstimate | null;   // null until it lands or if it failed (#3b)
};

// One slot per tier so they can land independently (#9).
type TierSlot =
  | { status: 'pending' }
  | { status: 'done'; package: MaterialPackage }
  | { status: 'failed'; error: string };

// Same as today's MaterialPackage, plus `assumptions`.
type MaterialPackage = {
  tier: MaterialTier;
  title: string;
  tagline: string;
  items: MaterialLineItem[];
  subtotal: number;            // computed by the SERVER (sum of item prices)
  pricedAt: string;            // YYYY-MM-DD, oldest price in the package
  assumptions: string[];       // NEW, e.g. "10% waste included", "existing floor removed"
};

// Today's fields unchanged; new fields marked.
type MaterialLineItem = {
  name: string;
  explanation: string;
  quantity: string;            // display string in the user's unit, e.g. "140 sq ft"
  quantityValue: number;       // NEW: numeric quantity, in the user's unit
  quantityUnit: string;        // NEW: 'sq ft' | 'm²' | 'ft' | 'm' | 'gal' | 'box' | 'each' …
  unitPrice: number;           // NEW: USD per quantityUnit
  price: number;               // line total, computed by the SERVER (rounded quantityValue × unitPrice)
  retailer: string | null;     // NOW NULLABLE: null when no store was found
  url: string | null;          // NOW NULLABLE: product/search page; affiliate link later (#3)
  priceSource: 'web_search' | 'cache' | 'ai_estimate';   // NEW
  priceCheckedAt: string;      // NEW: YYYY-MM-DD the price was found
};

// #3b: days and total, both ranges.
type LabourEstimate = {
  daysMin: number;
  daysMax: number;
  totalMin: number;            // USD
  totalMax: number;
  basis: string;               // one line, e.g. "1 tiler, typical metro day rate"
};
```

**`priceSource` drives the UI:** `web_search` and `cache` are real found prices, and
`ai_estimate` means search found nothing and the model guessed. The card should mark those
lines (for example "est.") so a guess never looks like a real price.

### 4. Who computes what

- **Server (deterministic):** geometry from the inputs, which is floor area, wall area
  `2 × (L + W) × H` and perimeter, in both the user's unit and imperial. It's passed to the
  model as facts. The server also does all the dollar maths: `price`, `subtotal`, and
  rounding. **The AI never does the final arithmetic.**
- **AI:** which materials, how many (`quantityValue`, using the supplied geometry plus
  waste), `unitPrice` via search, explanations, assumptions, photo notes, labour ranges.
- **Validation:** the action hook checks each AI response against this schema (structured
  output already enforces most of it), then recomputes `price`/`subtotal`. A tier whose
  response fails validation becomes `failed`, not half-written.

### 5. Things this changes in the app (build notes, not code yet)

- **Store the estimate, don't rebuild it.** `getSelectedPackage()` currently rebuilds
  the package from the draft, and the edit flow depends on that. Real results can't be
  rebuilt, so the draft holds the `estimate_requests` id plus the fetched result. A
  new `quotes.estimate_request` (M2O) links a saved quote to it, so **reopening a quote
  reloads the stored result instead of calling the AI again**. `quote_items` keeps its
  current role: a snapshot of the chosen package's lines at save time.
- **Stale estimate:** if dimensions, job type, brief, ZIP or photos change after an
  estimate, the Materials step shows "Details changed, refresh the estimate"
  instead of silently keeping old numbers.
- **Job-type-aware quantities** (the Phase-1 gap above): with wall area passed in,
  painting is priced off the walls. **Height becomes required** for wall-based job
  types in `quote-schema.ts`.
- **Mock retires from the screen.** `materials-mock.ts` keeps only the types and
  stays useful as test data. Per #10 it is never shown as a real result.

### 6. Collections (replaces the old `materials` / `material_estimates` plan)

- **`estimate_requests`**: the job row in §2.
- **`price_cache`** (#8): `product_key` (normalized name + unit), `zip3` (first
  3 ZIP digits as the "local area"), `unit_price`, `retailer`, `url`, `checked_at`.
  Entries are reused for ~7 days. Server-only: the app never reads it.

### 7. Still open inside #7

- ✅ **Homeowner totals with a labour range: decided 2026-10-14, add `_min`/`_max` columns.**
  Materials are one number per tier, but labour is a range, so a homeowner's grand total
  is a range too ("$4,200–4,800"). `quotes` gets `labour_total_min` / `labour_total_max`
  and `grand_total_min` / `grand_total_max`, so a reopened quote shows exactly the range
  the user saw (no midpoint rebuild). Contractor quotes are a single figure, so they write
  min = max. Build notes:
  - The payload validator's `grand_total == materials_total + labour_total` rule
    (SECURITY.md) has to hold for both ends: `grand_min = materials + labour_min` and
    `grand_max = materials + labour_max`, plus `min ≤ max`.
  - What happens to the existing `labour_total` / `grand_total` columns (keep as the
    single-figure field or migrate into the pairs) gets settled when the schema is built.
    Lists and the Home tab read `grand_total` today, so they'll need to show the range.
- **Single-line swaps** (existing open question below) stay out of v1.

> **Superseded (2026-10-08):** the "Implementation options" survey below predates the
> #1–#11 decisions. Where it differs (one call for all tiers, Opus, whole-result
> cache, mock packages as the failure fallback), the decisions in OPEN-QUESTIONS.md
> and BACKEND.md win. It's kept as history.

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
