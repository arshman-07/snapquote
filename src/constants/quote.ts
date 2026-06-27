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

export type Material = {
  id: string;
  name: string;
  // How the material is priced (e.g. per m², per litre). Shown next to the price.
  unit: string;
  unitPrice: number;
  // A short, human note about what it's for — gives the list some texture.
  note: string;
};

// Sample materials catalogue. Prices are illustrative placeholders.
export const MATERIAL_CATALOG: Material[] = [
  { id: 'tiles', name: 'Floor tiles', unit: 'per m²', unitPrice: 28, note: 'Porcelain, mid-range' },
  { id: 'adhesive', name: 'Tile adhesive', unit: 'per bag', unitPrice: 14, note: 'Covers ~5 m²' },
  { id: 'grout', name: 'Grout', unit: 'per bag', unitPrice: 9, note: 'Flexible, waterproof' },
  { id: 'paint', name: 'Wall paint', unit: 'per litre', unitPrice: 18, note: 'Matt emulsion, 2 coats' },
  { id: 'primer', name: 'Primer / sealer', unit: 'per litre', unitPrice: 12, note: 'Preps bare surfaces' },
  { id: 'skirting', name: 'Skirting board', unit: 'per m', unitPrice: 6, note: 'Primed MDF' },
  { id: 'underlay', name: 'Underlay', unit: 'per m²', unitPrice: 7, note: 'Acoustic, 5mm' },
];

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
