// Shared, static Phase 1 data for the quote flow. None of this is wired to a
// backend yet — it's hard-coded sample data so the screens have something
// realistic to render. Phase 2 will replace these with Directus-backed config.

export const UNITS = ['ft', 'm'] as const;
export type Unit = (typeof UNITS)[number];

// Offline fallback for the room / job types offered at the start of a quote.
// The Dimensions step fetches these from Directus (`useRoomTypes`); this static
// list is only shown when that request fails so a quote can still be started.
// Final launch list is still an open product question (see
// docs/tasks/dimensions-input.md).
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

// Offline fallback for the quick-pick daily labour rates (USD). The Labour step
// fetches live rates from Directus (`useLabourRates`); these are shown when the
// request fails or the collection is empty. The user can always type a custom
// figure regardless.
export const LABOUR_RATE_PRESETS = [300, 450, 600] as const;

// Currency helpers so every screen formats money the same way. USD — the app
// launches in the US.
//
// Two variants on purpose. `formatAmount` is the default for anything inside a
// list or breakdown: the currency is stated once in that section's header, so
// repeating "$" on every line is noise that also breaks digit alignment.
// `formatMoney` (with the symbol) is for standalone figures that appear without
// that surrounding context. Both are always rendered with `tabular`.
export const CURRENCY_CODE = 'USD';

export function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatMoney(amount: number): string {
  return `$${formatAmount(amount)}`;
}
