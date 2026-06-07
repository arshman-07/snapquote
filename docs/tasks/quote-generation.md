# Task: Quote Generation

## Goal

Combine material cost + labour into a rough total quote, broken down and presented in a
way the company can show a customer.

## Scope

- Inputs: material subtotal (from AI estimation) + labour cost (from labour rate).
- Output: a quote summary — line items, subtotals, total.
- Optionally save the quote and share/show it to the customer.

## Phase 1 (placeholders)

- [ ] Quote summary screen with a sample breakdown (materials + labour + total).
- [ ] Static numbers pulled from the placeholder data of earlier steps.

## Later

- [ ] Persist quotes to Directus (`quotes` + `quote_items`).
- [ ] Editable line items before finalizing.
- [ ] Share/export (PDF, link) — TBD.
- [ ] Saved quotes list.

## Open questions

- Do we add margin/markup or tax on top of materials + labour?
- What does "show the customer" mean — in-app, PDF, shareable link?

## Status

- [ ] Not started
