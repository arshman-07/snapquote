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

## Approach (decided 2026-06-27)

- **Good/better/best**: three packages, not one list. The selected tier's subtotal feeds the quote.
- **AI + web-search/affiliate APIs, NOT scraping** — AI proposes materials/tiers/explanations; a
  retailer API attaches real price + (affiliate) buy link. Cache in Postgres, ~7-day TTL + `pricedAt`.
  See [BACKEND.md](../BACKEND.md).
- Quantities are **grounded in floor area** (e.g. "≈140 sq ft of tile"), not generic.

## Phase 1 (placeholders)

- [x] Materials screen: brief + ZIP inputs, "Get options" with a simulated loading round-trip.
- [x] Three selectable package cards (items, explanations, buy links, subtotal, freshness date).
- [x] Selected tier's subtotal flows into the quote total (`getMaterialsTotal`).
- [x] Mock (`src/constants/materials-mock.ts`) is shaped to the eventual server response, so the
      screen won't change when wired to Directus.

## Later (Phase 3)

- [ ] Choose AI model/provider; decide integration shape (endpoint vs Flow vs microservice).
- [ ] Wire retailer/affiliate price + buy-link lookup; implement the Postgres cache + TTL.
- [ ] Refresh-busts-cache; per-category TTLs for volatile materials.

## Open questions

- ~~Where do material unit prices come from?~~ → AI proposes items, retailer/affiliate API prices them.
- How do we handle AI uncertainty / let the user swap a single line within a package?

## Status

- [x] Phase 1 UI built on a mock matching the server contract. Phase 3 backend not started.
