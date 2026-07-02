# Task: Quote Generation

## Goal

Combine material cost + labour into a rough total quote, broken down and presented in a
way the company can show a customer.

## Scope

- Inputs: material subtotal (from AI estimation) + labour cost (from labour rate).
- Output: a quote summary — line items, subtotals, total.
- Optionally save the quote and share/show it to the customer.

## Phase 1 (placeholders)

- [x] Quote summary screen with a sample breakdown (materials + labour + total).
- [x] Static numbers pulled from the placeholder data of earlier steps.

> Built 2026-06-29 (`src/app/(quote)/summary.tsx`). Receipt-style: job recap (room + floor area),
> the chosen material package's itemized lines + materials subtotal, a `days × rate/day` labour line
> + labour subtotal, and a headline accent grand total, plus a freshness/disclaimer line. Empty
> sections degrade gracefully. Totals come from the shared `QuoteDraft` helpers (`getSelectedPackage`,
> `getMaterialsTotal`, `getLabourTotal`, `getQuoteTotal`). Done clears the draft + returns home.

## Later

- [x] Persist quotes to Directus (2026-07-02). `buildQuotePayload` (`src/lib/quote-payload.ts`)
      converts the draft + derived totals into the `quotes` row and `quote_items` lines (one per
      material in the chosen package + one labour line). `useSaveQuote`
      (`src/hooks/use-save-quote.ts`) creates the quote then its items, and invalidates `['quotes']`.
      Summary's Done saves with a pending "Saving…" state; a **"Mark as final"** toggle decides
      `status` (`draft` by default); on failure an alert offers Retry / Finish without saving /
      Cancel — the quote is never lost silently. Also fixed the pre-existing `dismissTo('/index')`
      typedRoutes error (`'/'`). **Note:** Public read on `quotes` currently excludes the `status`
      field — grant it in the admin before the recent-quotes list needs to badge drafts. Public
      create/read on both collections is temporary until auth (Section 7) locks it down.
- [ ] Editable line items before finalizing.
- [ ] Share/export (PDF, link) — TBD.
- [ ] Saved quotes list.

## Open questions

- Do we add margin/markup or tax on top of materials + labour?
- What does "show the customer" mean — in-app, PDF, shareable link?

## Status

- [x] Phase 1: placeholder summary screen built (2026-06-29)
- [ ] Later: persistence, editable line items, share/export, saved quotes list
