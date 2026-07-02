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

- [x] Phase 2 foundation in place (2026-07-01): Directus SDK client + TanStack Query wired
      at the root (`src/lib/directus.ts`, `src/lib/query.ts`). Steps not yet consuming it.
- [x] Wire this step to fetch `room_types` from Directus (2026-07-02). `useRoomTypes` hook
      (`src/hooks/use-room-types.ts`) feeds the Job type chips via TanStack Query; loading shows a
      spinner, error/offline falls back to the static `JOB_TYPES` list so a quote can still start.
      Selecting a chip stores both `jobTypeId` (Directus `room_types.id`) and `jobType` (display
      name) on the draft — id is locked in for a future `quotes.job_type` relation / Phase-3
      room-keyed config, name keeps all existing display code working.
- [x] `react-hook-form` + `zod` validation (2026-07-02). Schema in `src/lib/quote-schema.ts`;
      the Dimensions form is RHF-owned (seeded from the draft, `mode: 'onChange'`) and writes back
      to the shared draft only on a valid Continue. Unit-aware sanity bounds (ft/m) via a cross-field
      `superRefine`; per-field error text; height optional; Continue gates on `formState.isValid`.
- [ ] Feed dimensions into AI material estimation (Phase 3).

## Open questions

- Which job/room types do we support at launch?
- Do we need multiple surfaces per quote (e.g. walls + floor) or one area at a time?

## Status

- [x] Phase 1 Dimensions screen built (static placeholders), wired into the multi-step quote flow.
- [x] Steps 2–5 (Photo / Materials / Labour / Summary) now built on the shared chrome (2026-06-29).
- Open questions below still need product answers.
