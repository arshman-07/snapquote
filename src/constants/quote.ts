// Shared, static Phase 1 data for the quote flow. None of this is wired to a
// backend yet — it's hard-coded sample data so the screens have something
// realistic to render. Phase 2 will replace these with Directus-backed config.

export const UNITS = ['ft', 'm'] as const;
export type Unit = (typeof UNITS)[number];

// Room / job types offered at the start of a quote. Final launch list is still
// an open product question (see docs/tasks/dimensions-input.md).
export const JOB_TYPES = [
  'Bathroom',
  'Kitchen',
  'Bedroom',
  'Living room',
  'Hallway',
  'Office',
] as const;

// (The Materials step's tiered packages live in `materials-mock.ts`, shaped to
// the eventual server response.)

// The flow's ordered steps. Drives the progress indicator shown on each screen.
export const QUOTE_STEPS = ['Dimensions', 'Photo', 'Materials', 'Labour', 'Summary'] as const;
export const QUOTE_STEP_COUNT = QUOTE_STEPS.length;

// Quick-pick daily labour rates (USD). Illustrative US trade day rates; the
// user can always type a custom figure on the Labour step.
export const LABOUR_RATE_PRESETS = [300, 450, 600] as const;

// Currency helper so every screen formats money the same way. USD — the app
// launches in the US.
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
