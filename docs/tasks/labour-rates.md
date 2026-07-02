# Task: Labour Rates

## Goal

Let the company set/update their own labour rate and factor it into the quote total.

## Scope

- Labour priced as **days on site × a daily rate (USD)** — decided 2026-06-27 (day rate is the
  natural unit for the trade; not hourly).
- Applied to the quote alongside material cost.
- Stored per company (Phase 2: `labour_rates` collection in Directus).

## Phase 1 (placeholders)

- [x] Labour screen (`src/app/(quote)/labour.tsx`): −/+ days stepper + daily-rate field with
      quick-pick presets ($300 / $450 / $600).
- [x] Live "Estimated labour" card (days × rate); `getLabourTotal` feeds the quote total.
- [x] Continue gated on days > 0 and rate > 0.

## Later

- [x] Quick-pick rates fetched from Directus `labour_rates` (2026-07-02). `useLabourRates` hook
      (`src/hooks/use-labour-rates.ts`), sorted cheapest-first; loading spinner; error/offline or an
      empty collection falls back to the static `LABOUR_RATE_PRESETS` (offline note only on real
      failure). Custom rate field unchanged. **Note:** collection is still unseeded — add rows
      (300/450/600 USD) in the Directus admin to exercise the live path. Public read granted.
- [ ] Remember the company's usual rate (write-back — needs auth).
- [ ] Support multiple rate types / per-job-type rates.

## Open questions

- ~~Hours vs flat/area-based?~~ → **days × daily rate.**
- Single rate or multiple (e.g. per trade / per job type)?

## Status

- [x] Phase 1 screen built (static/local state, USD day-rate model).
