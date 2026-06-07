# Task: AI Material Estimation

## Goal

Given the job dimensions (and optionally a photo), use AI to determine the material types
needed and their prices, producing a rough material subtotal.

## Scope

- Input: dimensions + job/room type (from [dimensions-input](./dimensions-input.md)),
  optionally a photo (from [photo-estimation](./photo-estimation.md)).
- Output: list of materials (name, qty, unit, unit price, subtotal) + total material cost.
- Runs **server-side** via Directus (endpoint/flow) or a companion service — never from
  the frontend.

## Phase 1 (placeholders)

- [ ] Materials screen shows a hard-coded sample list of materials + prices.
- [ ] Sample material subtotal displayed.

## Later

- [ ] Choose AI model/provider.
- [ ] Decide integration shape (Directus custom endpoint vs Flow vs microservice) —
      see [BACKEND.md](../BACKEND.md).
- [ ] Map dimensions + job type → material quantities.
- [ ] Pull unit prices from the `materials` collection in Directus.

## Open questions

- Where do material unit prices come from — AI, our `materials` catalog, or both?
- How do we handle AI uncertainty / let the user edit the material list?

## Status

- [ ] Not started
