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
export function buildQuotePayload(draft: QuoteDraft, status: 'draft' | 'final'): QuotePayload {
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
      job_type: draft.jobType,
      length: toNumberOrNull(draft.length),
      width: toNumberOrNull(draft.width),
      height: toNumberOrNull(draft.height),
      unit: draft.unit,
      material_brief: draft.materialBrief || null,
      material_zip: draft.materialZip || null,
      selected_tier: draft.selectedTier,
      materials_total: getMaterialsTotal(draft) || null,
      labour_total: labourTotal || null,
      grand_total: getQuoteTotal(draft) || null,
      status,
    },
    items,
  };
}
