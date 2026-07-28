import {
  getLabourTotal,
  getMaterialsTotal,
  getQuoteTotal,
  getSelectedPackage,
  type QuoteDraft,
} from '@/context/quote-draft';
import { formatMoney } from '@/constants/quote';
import { type Quote, type QuoteItem } from '@/lib/directus';

// What the save mutation sends: the quotes row (minus server-generated fields)
// plus its line items (minus the quote id, which is only known after the quote
// row is created).
export type QuotePayload = {
  quote: Omit<Quote, 'id' | 'date_created' | 'user_created'>;
  items: Omit<QuoteItem, 'id' | 'quote'>[];
};

// Parse a wizard dimension string to a number for storage, or null when empty
// or unusable. The wizard validates before this runs; this is just conversion.
function toNumberOrNull(raw: string): number | null {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

// Convert the finished draft into the Directus rows to persist. Totals reuse
// the same derived getters every screen renders from, so what's saved is
// exactly what the Summary showed.
export function buildQuotePayload(draft: QuoteDraft): QuotePayload {
  const pkg = getSelectedPackage(draft);
  const labourTotal = getLabourTotal(draft);
  const days = parseInt(draft.labourDays || '0', 10) || 0;
  const rate = toNumberOrNull(draft.labourDayRate);

  // One line per material in the chosen package, then a single labour line.
  const items: QuotePayload['items'] = (pkg?.items ?? []).map((item) => ({
    kind: 'material' as const,
    label: `${item.name} (${item.quantity})`,
    amount: item.price,
  }));
  if (labourTotal > 0 && rate !== null) {
    items.push({
      kind: 'labour',
      label: `${days} ${days === 1 ? 'day' : 'days'} × ${formatMoney(rate)}/day`,
      amount: labourTotal,
    });
  }

  return {
    quote: {
      // Trimmed, and null rather than '' when left blank so the fallback to
      // job_type is a simple null check everywhere it's rendered.
      customer_name: draft.customerName.trim() || null,
      job_type: draft.jobType,
      length: toNumberOrNull(draft.length),
      width: toNumberOrNull(draft.width),
      height: toNumberOrNull(draft.height),
      unit: draft.unit,
      material_brief: draft.materialBrief || null,
      material_zip: draft.materialZip || null,
      selected_tier: draft.selectedTier,
      materials_total: getMaterialsTotal(draft) || null,
      // Persist the labour *inputs*, not just the product. Without these the
      // Labour step can't be rehydrated when the quote is reopened for editing
      // — the days and rate would otherwise survive only inside an item's
      // label text.
      labour_days: days || null,
      labour_day_rate: rate,
      labour_total: labourTotal || null,
      grand_total: getQuoteTotal(draft) || null,
      status: draft.status,
    },
    items,
  };
}

// The inverse mapping: a saved quote back into a wizard draft, so an existing
// quote can be reopened and edited through the same five steps that created it.
// Kept next to buildQuotePayload so the two directions can't drift.
//
// Two fields don't survive the round trip, by design:
//  - `jobTypeId` — quotes store the room type's *name*, not the room_types id,
//    so this comes back null. The Dimensions step already falls back to
//    matching chips by name, so selection still restores correctly.
//  - `photoAdded` — never persisted (Phase 1 has no real capture).
export function draftFromQuote(quote: Quote): QuoteDraft {
  const str = (n: number | null) => (n === null ? '' : String(n));

  return {
    customerName: quote.customer_name ?? '',
    jobTypeId: null,
    jobType: quote.job_type,
    unit: (quote.unit as QuoteDraft['unit']) || 'ft',
    length: str(quote.length),
    width: str(quote.width),
    height: str(quote.height),
    photoAdded: false,
    materialBrief: quote.material_brief ?? '',
    materialZip: quote.material_zip ?? '',
    selectedTier: quote.selected_tier,
    labourDays: str(quote.labour_days),
    labourDayRate: str(quote.labour_day_rate),
    status: quote.status === 'final' ? 'final' : 'draft',
  };
}
