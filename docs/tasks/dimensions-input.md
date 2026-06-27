# Task: Dimensions Input

## Goal

Let the user enter the dimensions of the area to be worked on, plus the job/room type,
as the starting point of a quote.

## Scope

- Inputs: length, width, height (where relevant), unit (ft/m), room/job type.
- Derived: area / volume as needed for material estimation.
- Validation: numeric, positive, sensible ranges.

## Phase 1 (placeholders)

- [x] Build the New Quote form screen with these inputs. (`src/app/(quote)/new-quote.tsx`)
- [x] Static unit toggle (ft/m) + job-type picker with sample options.
- [x] No validation library yet — basic/visual only (Continue disabled until job type + valid area).
- [x] "Continue" advances to the Photo step (`router.push('/photo')`), then the rest of the flow.
      The whole wizard now walks end-to-end; later steps are stubs being filled in one at a time.

Reached via a "Start a new quote" button on the Home screen (`src/app/(tabs)/index.tsx`).
Live floor-area preview (length × width) shown once both are valid. Height is optional.

Inputs are written into the shared `QuoteDraft` (`src/context/quote-draft.tsx`) so the materials,
labour, and summary steps can size up the quote from them. Built on the shared flow chrome
(`quote-step-screen`, `step-progress`, `step-footer`).

## Later

- [ ] `react-hook-form` + `zod` validation (Phase 2).
- [ ] Feed dimensions into AI material estimation (Phase 3).

## Open questions

- Which job/room types do we support at launch?
- Do we need multiple surfaces per quote (e.g. walls + floor) or one area at a time?

## Status

- [x] Phase 1 Dimensions screen built (static placeholders), wired into the multi-step quote flow.
- [~] Steps 2–5 (Photo / Materials / Labour / Summary) stubbed on shared chrome; content in progress.
- Open questions below still need product answers.
