import { z } from 'zod';

import { UNITS, type Unit } from '@/constants/quote';

// Validation for the Dimensions step (Section 3). The three dimension inputs
// stay raw strings — that's what the TextInputs hold while the user types — and
// we validate the parsed number with a cross-field `superRefine` so the allowed
// range can depend on the selected unit.

// Per-unit sanity bounds. Generous by design: they catch typos, negatives, and
// absurd values, not fine-grained "is this a realistic room" checks. Easy to
// tune later.
const BOUNDS = {
  ft: { plan: { min: 0.1, max: 1000 }, height: { min: 1, max: 30 } },
  m: { plan: { min: 0.03, max: 300 }, height: { min: 0.3, max: 10 } },
} as const;

// Parse a dimension string to a number, or null if it isn't a usable value.
function toNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// Validate one dimension string against a min/max range, adding an issue at the
// given field path when it's missing or out of range.
function checkRange(
  raw: string,
  bounds: { min: number; max: number },
  unit: Unit,
  field: 'length' | 'width' | 'height',
  ctx: z.RefinementCtx,
) {
  const n = toNumber(raw);
  if (n === null || n <= 0) {
    ctx.addIssue({ code: 'custom', path: [field], message: 'Enter a positive number.' });
  } else if (n < bounds.min || n > bounds.max) {
    ctx.addIssue({
      code: 'custom',
      path: [field],
      message: `Must be between ${bounds.min} and ${bounds.max} ${unit}.`,
    });
  }
}

export const dimensionsSchema = z
  .object({
    // A room must be picked. jobTypeId is null when offline (no Directus id), so
    // the presence of a name is what we actually require.
    jobTypeId: z.number().nullable(),
    jobType: z.string().min(1, 'Pick a job type.'),
    unit: z.enum(UNITS),
    length: z.string(),
    width: z.string(),
    height: z.string(), // optional — validated only when non-empty
  })
  .superRefine((data, ctx) => {
    const b = BOUNDS[data.unit];
    checkRange(data.length, b.plan, data.unit, 'length', ctx);
    checkRange(data.width, b.plan, data.unit, 'width', ctx);
    // Height is optional: empty is fine, but if given it must be in range.
    if (data.height.trim() !== '') {
      checkRange(data.height, b.height, data.unit, 'height', ctx);
    }
  });

export type DimensionsForm = z.infer<typeof dimensionsSchema>;
