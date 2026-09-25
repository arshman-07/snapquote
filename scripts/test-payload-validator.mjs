// SnapQuote — quote-payload-validator unit tests (SECURITY.md §3.3)
//
// Registers the hook extension against a fake `filter` registry and runs
// payloads through the real handlers. No server, no network, no dependencies:
//
//   node scripts/test-payload-validator.mjs
//
// This is not a substitute for scripts/probe-permissions.sh — it cannot see
// Directus permissions, field allow-lists, or whether the extension actually
// loaded on the box. What it does prove is the rules themselves, and above all
// the half that is easy to get wrong: that every payload the app legitimately
// sends is still *accepted*. A validator that blocks real saves is a worse bug
// than the one it fixes.
//
// Exits non-zero on any failure, so it can gate a commit or CI later.

import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const extension = join(here, '..', 'directus', 'extensions', 'quote-payload-validator', 'index.js');

const mod = await import(pathToFileURL(extension).href);

const handlers = {};
mod.default({ filter: (event, fn) => (handlers[event] = fn) });

const ACC = { user: 'user-uuid', role: 'app-user' };

function attempt(event, payload, accountability = ACC) {
  try {
    handlers[event](payload, {}, { accountability });
    return { ok: true };
  } catch (error) {
    return { ok: false, status: error.status, code: error.code, message: error.message };
  }
}

let pass = 0;
let fail = 0;

function expect(label, event, payload, shouldPass, accountability) {
  const result = attempt(event, payload, accountability);
  const good = result.ok === shouldPass;
  if (good) pass++;
  else fail++;
  const verdict = good ? 'PASS' : 'FAIL';
  const detail = result.ok ? 'accepted' : `${result.status} ${result.message}`;
  console.log(`  [${verdict}] ${label}\n          → ${detail}`);
}

// A realistic buildQuotePayload() output: Bathroom, 12x10 ft, standard tier.
const realQuote = {
  customer_name: 'Mrs Alvarez — 14 Oak St',
  job_type: 'Bathroom',
  length: 12,
  width: 10,
  height: 8,
  unit: 'ft',
  material_brief: 'Retile the floor and replace the vanity.',
  material_zip: '07030',
  selected_tier: 'standard',
  materials_total: 2480.5,
  labour_days: 3,
  labour_day_rate: 450,
  labour_total: 1350,
  grand_total: 3830.5,
  status: 'draft',
};

console.log('\n— Legitimate app traffic (must all be accepted) —');
expect('create: full wizard payload', 'quotes.items.create', { ...realQuote }, true);
expect('create: metric units', 'quotes.items.create',
  { ...realQuote, unit: 'm', length: 3.6, width: 3, height: 2.4 }, true);
expect('create: no labour (nulls, as `|| null` produces)', 'quotes.items.create',
  { ...realQuote, labour_days: null, labour_day_rate: null, labour_total: null,
    grand_total: 2480.5 }, true);
expect('create: unnamed quote (customer_name null)', 'quotes.items.create',
  { ...realQuote, customer_name: null }, true);
expect('create: no brief/zip/tier yet', 'quotes.items.create',
  { ...realQuote, material_brief: null, material_zip: null, selected_tier: null }, true);
expect('create: status final', 'quotes.items.create', { ...realQuote, status: 'final' }, true);
expect('update: rename dialog partial PATCH', 'quotes.items.update',
  { customer_name: 'New name' }, true);
expect('update: rename to blank (null)', 'quotes.items.update', { customer_name: null }, true);
expect('update: full edit re-save', 'quotes.items.update', { ...realQuote }, true);
// REVERSED 2026-09-23: this used to expect `true`. It was testing the exact
// shape of the bug fixed today — a dimension-only PATCH with no `unit` used to
// fall back to EITHER_UNIT (the union of both units' bounds), which is wider
// than either individual bound, so 850 passed as if it were feet even though
// no unit was named. The fix rejects a dimension without a valid `unit` in the
// same payload outright (see the dimension-bounds comment in index.js). This
// doesn't cost the app anything: its two update paths are the rename-only
// PATCH (`useUpdateQuote`, never touches dimensions) and the full re-save from
// `buildQuotePayload()` (`useEditQuote`), which always sends `unit` alongside
// dimensions — so no real PATCH ever looks like this one.
expect('update: lone dimension, no unit in payload', 'quotes.items.update', { length: 850 }, false);
expect('create: material line item', 'quote_items.items.create',
  { kind: 'material', label: 'Porcelain tile 60x60 (14 boxes)', amount: 1240, quote: 7 }, true);
expect('create: labour line item', 'quote_items.items.create',
  { kind: 'labour', label: '3 days × $450/day', amount: 1350, quote: 7 }, true);
expect('create: zero-amount item', 'quote_items.items.create',
  { kind: 'material', label: 'Offcuts reused', amount: 0, quote: 7 }, true);
expect('batch create (array payload)', 'quote_items.items.create',
  [{ kind: 'material', label: 'A', amount: 10, quote: 7 },
   { kind: 'labour', label: 'B', amount: 20, quote: 7 }], true);
expect('internal call, no accountability', 'quotes.items.create',
  { grand_total: -999, status: 'nonsense' }, true, null);
// probe-permissions.sh creates minimal rows like this for its setup and its
// Group F field target. If this is ever rejected, the security suite breaks.
expect('create: minimal row (probe-permissions.sh setup)', 'quotes.items.create',
  { job_type: 'probe', unit: 'ft' }, true);
expect('create: dimensionless draft', 'quotes.items.create',
  { ...realQuote, length: null, width: null, height: null }, true);

console.log('\n— Garbage a raw API client could send (must all be rejected) —');
expect('negative grand_total', 'quotes.items.create', { ...realQuote, grand_total: -5 }, false);
expect('negative line amount', 'quote_items.items.create',
  { kind: 'material', label: 'x', amount: -100, quote: 7 }, false);
expect('absurd dimension (1e308)', 'quotes.items.create', { ...realQuote, length: 1e308 }, false);
expect('dimension out of ft range (2000ft)', 'quotes.items.create',
  { ...realQuote, length: 2000 }, false);
expect('height out of ft range (60ft)', 'quotes.items.create', { ...realQuote, height: 60 }, false);
expect('metric dimension judged by metric bounds (400m)', 'quotes.items.create',
  { ...realQuote, unit: 'm', length: 400 }, false);
expect('bogus status', 'quotes.items.create', { ...realQuote, status: 'approved' }, false);
expect('bogus tier', 'quotes.items.create', { ...realQuote, selected_tier: 'deluxe' }, false);
expect('bogus unit', 'quotes.items.create', { ...realQuote, unit: 'cubits' }, false);
expect('bogus item kind', 'quote_items.items.create',
  { kind: 'consulting', label: 'x', amount: 1, quote: 7 }, false);
expect('10MB material_brief', 'quotes.items.create',
  { ...realQuote, material_brief: 'A'.repeat(10 * 1024 * 1024) }, false);
expect('oversized customer_name', 'quotes.items.create',
  { ...realQuote, customer_name: 'A'.repeat(500) }, false);
expect('numeric string instead of number', 'quotes.items.create',
  { ...realQuote, grand_total: '3830.50' }, false);
expect('NaN total', 'quotes.items.create', { ...realQuote, labour_total: NaN }, false);
expect('totals that do not add up', 'quotes.items.create',
  { ...realQuote, grand_total: 99 }, false);
// The bug this closes: PATCH-ing grand_total alone used to skip
// checkTotalsAgree entirely (it only ran when all three fields were present),
// leaving grand_total bounded only by 0..100,000,000 — so this used to be
// ACCEPTED. Totals must now arrive all together or not at all.
expect('update: lone grand_total PATCH', 'quotes.items.update', { grand_total: 99999999 }, false);
expect('update: two of three totals (materials_total + grand_total, no labour_total)',
  'quotes.items.update', { materials_total: 500, grand_total: 500 }, false);
// Same bug, the dimension-bounds half: a dimension PATCH omitting `unit` used
// to fall back to EITHER_UNIT (the union of both units' ranges), which is
// wider than the metric range alone — so 500 (nonsense for a metric quote,
// meaningless without knowing the unit at all) used to be ACCEPTED because it
// fits inside the ft-sized union (0.03-1000).
expect('update: dimension PATCH omitting unit (metric-range value)',
  'quotes.items.update', { length: 500 }, false);
expect('create: empty job_type', 'quotes.items.create', { ...realQuote, job_type: '' }, false);
expect('create: whitespace-only job_type', 'quotes.items.create',
  { ...realQuote, job_type: '   ' }, false);
expect('money over cap', 'quotes.items.create',
  { ...realQuote, materials_total: 5e8, labour_total: 0, grand_total: 5e8 }, false);
expect('labour_days absurd', 'quotes.items.create', { ...realQuote, labour_days: 99999 }, false);
expect('create missing job_type', 'quotes.items.create',
  { ...realQuote, job_type: undefined }, false);
expect('create missing unit', 'quotes.items.create', { ...realQuote, unit: null }, false);
expect('item create missing amount', 'quote_items.items.create',
  { kind: 'material', label: 'x', quote: 7 }, false);
expect('one bad row in a batch rejects the batch', 'quote_items.items.create',
  [{ kind: 'material', label: 'A', amount: 10, quote: 7 },
   { kind: 'material', label: 'B', amount: -1, quote: 7 }], false);

console.log('\n— Float tolerance —');
expect('float addition within a cent', 'quotes.items.create',
  { ...realQuote, materials_total: 1234.56, labour_total: 78.9, grand_total: 1234.56 + 78.9 },
  true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
