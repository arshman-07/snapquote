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

- [ ] Persist labour rates to Directus (`labour_rates`); remember the company's usual rate.
- [ ] Support multiple rate types / per-job-type rates.

## Open questions

- ~~Hours vs flat/area-based?~~ → **days × daily rate.**
- Single rate or multiple (e.g. per trade / per job type)?

## Status

- [x] Phase 1 screen built (static/local state, USD day-rate model).
