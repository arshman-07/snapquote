# Task: Dimensions Input

## Goal

Let the user enter the dimensions of the area to be worked on, plus the job/room type,
as the starting point of a quote.

## Scope

- Inputs: length, width, height (where relevant), unit (ft/m), room/job type.
- Derived: area / volume as needed for material estimation.
- Validation: numeric, positive, sensible ranges.

## Phase 1 (placeholders)

- [ ] Build the New Quote form screen with these inputs.
- [ ] Static unit toggle + job-type picker with sample options.
- [ ] No validation library yet — basic/visual only.
- [ ] "Next" advances to the (placeholder) materials/estimation step.

## Later

- [ ] `react-hook-form` + `zod` validation (Phase 2).
- [ ] Feed dimensions into AI material estimation (Phase 3).

## Open questions

- Which job/room types do we support at launch?
- Do we need multiple surfaces per quote (e.g. walls + floor) or one area at a time?

## Status

- [ ] Not started
