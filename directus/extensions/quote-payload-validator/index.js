/**
 * SnapQuote — quote payload validator (Directus hook extension)
 *
 * Closes the open item in `docs/SECURITY.md` §2.5: client-side zod
 * (`src/lib/quote-schema.ts`) is UX, not security. It runs in the app, so a raw
 * API client holding a valid App User token can still POST a quote with
 * negative totals, a 10 MB brief, a bogus `status`, or dimensions of 1e308.
 * Row-level scoping decides *whose* rows you may touch; nothing until now
 * decided *what values* were allowed in them.
 *
 * Two rules govern everything here:
 *
 * 1. **Never reject what the app considers valid.** The bounds below mirror
 *    `src/lib/quote-schema.ts` exactly, and the text caps sit far above any
 *    realistic input. A validator that blocks legitimate saves is a worse bug
 *    than the one it fixes — see the `customer_name` lesson in
 *    `docs/BACKEND.md`, where one missing field permission broke every save.
 * 2. **Only judge what you were sent — but don't let "not sent" become a
 *    loophole.** Directus PATCHes are partial: the rename dialog sends
 *    `{customer_name}` alone. Every check is therefore keyed on the field
 *    being *present* in the payload. Two places need to check *how much* of a
 *    related group is present, not just whether one field is: the totals
 *    cross-check requires all three of materials_total/labour_total/
 *    grand_total together or none at all (a lone `grand_total` used to skip
 *    the check entirely rather than being reconciled against it), and a
 *    dimension (length/width/height) requires `unit` in the same payload,
 *    because guessing the bound from a union of both units' ranges is itself
 *    unsound — see the dimension-bounds comment below.
 *
 * Hand-written ESM — no build step. See ../README.md for deployment.
 */

// ── Mirrors of the client contract ──────────────────────────────────────────

const UNITS = ['ft', 'm'];
const TIERS = ['budget', 'standard', 'premium'];
const STATUSES = ['draft', 'final'];
const KINDS = ['material', 'labour'];

// Copied from BOUNDS in src/lib/quote-schema.ts. Keep the two in step: they are
// deliberately generous — they catch typos, negatives and absurd values, not
// "is this a realistic room".
const BOUNDS = {
  ft: { plan: { min: 0.1, max: 1000 }, height: { min: 1, max: 30 } },
  m: { plan: { min: 0.03, max: 300 }, height: { min: 0.3, max: 10 } },
};

// The app imposes no text limits at all, so these are new restrictions. Set far
// beyond any real input: the job is to stop someone POSTing megabytes of free
// text, not to police what a user types. `customer_name` stays under the 255
// its varchar column would reject anyway.
const MAX_TEXT = {
  customer_name: 200,
  job_type: 120,
  material_zip: 20,
  material_brief: 5000,
  label: 300,
};

// No quote is worth $100M. Bounds every money column and line-item amount.
const MONEY_MAX = 100000000;

// labour_days is an integer column; this is only an upper sanity bound (10y).
const DAYS_MAX = 3650;

// grand_total is computed as materials + labour in getQuoteTotal(), so the
// stored trio must agree. A cent of slack absorbs float addition.
const TOTAL_TOLERANCE = 0.01;

// Fields without which a quote is meaningless. Enforced on create only —
// updates are partial by nature.
//
// Deliberately NOT including length/width, though the wizard always sends them:
// both columns are nullable, a dimensionless draft harms nothing, and
// scripts/probe-permissions.sh legitimately creates minimal rows carrying only
// job_type and unit. Requiring them would have broken the security suite's own
// setup — rule 1 above, arriving by an unexpected route.
const REQUIRED_ON_CREATE = ['unit', 'job_type'];

// ── Registration ────────────────────────────────────────────────────────────

export default ({ filter }) => {
  filter('quotes.items.create', run(validateQuote, true));
  filter('quotes.items.update', run(validateQuote, false));
  filter('quote_items.items.create', run(validateItem, true));
  filter('quote_items.items.update', run(validateItem, false));
};

function run(validate, isCreate) {
  return (payload, _meta, { accountability }) => {
    // No accountability = an internal call (migration, flow, CLI), not user
    // input. The owner guard skips these for the same reason.
    if (!accountability) return payload;

    // createItems() batches arrive one at a time, but normalise in case a
    // future code path hands over the whole array.
    const items = Array.isArray(payload) ? payload : [payload];

    const errors = [];
    for (const item of items) {
      if (item && typeof item === 'object') validate(item, isCreate, errors);
    }
    if (errors.length > 0) throw failedValidation(errors);

    return payload;
  };
}

// ── Collection rules ────────────────────────────────────────────────────────

function validateQuote(item, isCreate, errors) {
  if (isCreate) {
    for (const field of REQUIRED_ON_CREATE) {
      if (isMissingForRequired(item, field)) errors.push('"' + field + '" is required.');
    }
  }

  checkEnum(item, 'unit', UNITS, errors);
  checkEnum(item, 'status', STATUSES, errors);
  checkEnum(item, 'selected_tier', TIERS, errors);

  for (const field of ['customer_name', 'job_type', 'material_zip', 'material_brief']) {
    checkText(item, field, MAX_TEXT[field], errors);
  }

  // Dimension bounds depend on the unit, which a partial payload may omit —
  // and a missing unit is NOT a shortcut to a looser combined bound. That was
  // the bug: the old fallback used the union of both units' ranges (plan
  // 0.03-1000, height 0.3-30), which is wider than the metric range alone
  // (plan 0.03-300, height 0.3-10), so `PATCH {"length": 500}` on a metric
  // quote sailed through as if it were feet. There is no safe guess here, so a
  // dimension without a valid `unit` in the same payload is rejected outright
  // rather than bounded loosely. This costs no legitimate save: `unit` is
  // already required on create (REQUIRED_ON_CREATE), and on update the app has
  // exactly two write paths — the rename-only PATCH (`useUpdateQuote`, which
  // never touches dimensions) and the full re-save from `buildQuotePayload()`
  // (`useEditQuote`), which always sends `unit` alongside length/width/height.
  const hasValidUnit = has(item, 'unit') && UNITS.includes(item.unit);
  const dimensionFields = ['length', 'width', 'height'];
  const dimensionProvided = dimensionFields.some((field) => !skip(item, field));

  if (dimensionProvided && !hasValidUnit) {
    // A present-but-bogus unit ("cubits") is already reported by checkEnum
    // above — don't duplicate the complaint, just skip the bound check below
    // (there's nothing sound to check it against).
    if (skip(item, 'unit')) errors.push('"unit" is required when a dimension is provided.');
  } else if (hasValidUnit) {
    const bounds = BOUNDS[item.unit];
    checkNumber(item, 'length', bounds.plan, errors);
    checkNumber(item, 'width', bounds.plan, errors);
    checkNumber(item, 'height', bounds.height, errors);
  }

  // Zero is legitimate for both: the wizard stores whatever the Labour step
  // held, and 0 there simply means no labour was added.
  checkNumber(item, 'labour_days', { min: 0, max: DAYS_MAX }, errors);
  checkNumber(item, 'labour_day_rate', { min: 0, max: MONEY_MAX }, errors);

  for (const field of ['materials_total', 'labour_total', 'grand_total']) {
    checkNumber(item, field, { min: 0, max: MONEY_MAX }, errors);
  }
  checkTotalsAgree(item, errors);
}

function validateItem(item, isCreate, errors) {
  if (isCreate) {
    for (const field of ['kind', 'amount']) {
      if (isMissingForRequired(item, field)) errors.push('"' + field + '" is required.');
    }
  }

  checkEnum(item, 'kind', KINDS, errors);
  checkText(item, 'label', MAX_TEXT.label, errors);
  checkNumber(item, 'amount', { min: 0, max: MONEY_MAX }, errors);
}

// ── Field checks ────────────────────────────────────────────────────────────
//
// Each is a no-op when the field is absent (partial PATCH) or explicitly null —
// every one of these columns is nullable.

function has(item, field) {
  return Object.prototype.hasOwnProperty.call(item, field);
}

function skip(item, field) {
  return !has(item, field) || item[field] === null || item[field] === undefined;
}

// Stricter than skip(): also treats a whitespace-only string as missing.
// Used only for the required-on-create checks — `POST {"unit":"ft",
// "job_type":""}` used to slip through because skip() only treats
// absent/null/undefined as missing, so an empty string sailed past it and
// straight through checkText (0 characters is under any max), and job_type
// has no enum backing it the way `kind`/`status`/etc do to catch a blank
// value some other way. Deliberately NOT folded into skip() itself: skip()
// also gates checkText/checkEnum/checkNumber for every optional field, where
// "" is just an ordinary (if odd) value to validate, not a sentinel for
// "unset" — null already owns that meaning (e.g. clearing customer_name).
function isMissingForRequired(item, field) {
  if (skip(item, field)) return true;
  const value = item[field];
  return typeof value === 'string' && value.trim().length === 0;
}

function checkEnum(item, field, allowed, errors) {
  if (skip(item, field)) return;
  if (!allowed.includes(item[field])) {
    errors.push('"' + field + '" must be one of: ' + allowed.join(', ') + '.');
  }
}

function checkText(item, field, max, errors) {
  if (skip(item, field)) return;
  if (typeof item[field] !== 'string') {
    errors.push('"' + field + '" must be text.');
  } else if (item[field].length > max) {
    errors.push('"' + field + '" must be ' + max + ' characters or fewer.');
  }
}

function checkNumber(item, field, bounds, errors) {
  if (skip(item, field)) return;
  const value = item[field];
  // Strings are rejected rather than coerced: the app sends real numbers, and
  // silently accepting "12" would let "" through as 0.
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push('"' + field + '" must be a number.');
  } else if (value < bounds.min || value > bounds.max) {
    errors.push('"' + field + '" must be between ' + bounds.min + ' and ' + bounds.max + '.');
  }
}

/**
 * grand_total must equal materials_total + labour_total, because that is
 * literally how getQuoteTotal() derives it.
 *
 * The three totals must arrive **all together or not at all**. Checking only
 * when all three happen to be present — and silently skipping otherwise — was
 * the bug: `PATCH {"grand_total": 99999999}` sent grand_total alone, so this
 * function returned immediately, and the only thing left standing was the
 * 0..100,000,000 range check on grand_total by itself. Requiring the full
 * trio (or none of them) closes that without needing a read of the stored
 * row — judging one total against values we weren't sent would need exactly
 * that, and is the false-rejection risk rule 2 exists to avoid. It costs no
 * legitimate save: `buildQuotePayload()` always emits all three keys together
 * (nulled, not omitted, when there's no labour yet — see the "no labour"
 * fixture in the test harness), and the only other update path
 * (`useUpdateQuote`, the rename dialog) never touches totals at all.
 *
 * Residual gap: this only proves internal arithmetic agreement
 * (grand == materials + labour), not that materials_total/labour_total match
 * the quote's actual quote_items rows. A client could still send a
 * self-consistent but fabricated trio. Closing that would mean summing
 * quote_items server-side via ItemsService on every quote write — a bigger,
 * async change (and, for updates that only touch some rows, an inherently
 * per-batch one) — left for a follow-up rather than folded in here.
 *
 * Note what is deliberately *not* checked: labour_days × labour_day_rate
 * against labour_total. getLabourTotal() parses days with parseFloat while the
 * payload stores parseInt, so a fractional day would make that identity false
 * for a perfectly legitimate save.
 */
function checkTotalsAgree(item, errors) {
  const fields = ['materials_total', 'labour_total', 'grand_total'];
  const present = fields.filter((field) => has(item, field));

  if (present.length === 0) return; // totals untouched by this write — nothing to reconcile

  if (present.length < fields.length) {
    errors.push('"materials_total", "labour_total" and "grand_total" must be sent together.');
    return;
  }

  const [materials, labour, grand] = fields.map((field) =>
    typeof item[field] === 'number' && Number.isFinite(item[field]) ? item[field] : 0,
  );

  if (Math.abs(materials + labour - grand) > TOTAL_TOLERANCE) {
    errors.push('"grand_total" must equal materials_total + labour_total.');
  }
}

/**
 * Directus identifies its own errors by duck-typing (`name === 'DirectusError'`
 * — see isDirectusError in @directus/errors), so we can return a proper 400
 * without importing that package. That keeps this extension dependency-free and
 * loadable with no build or npm install on the server. Same trick, and the same
 * fail-closed caveat, as forbidden() in the quote-item-owner-guard.
 */
function failedValidation(messages) {
  const error = new Error(messages.join(' '));
  error.name = 'DirectusError';
  error.code = 'FAILED_VALIDATION';
  error.status = 400;
  error.extensions = {};
  return error;
}
