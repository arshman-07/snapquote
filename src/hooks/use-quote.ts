import { readItem } from '@directus/sdk';
import { useQuery } from '@tanstack/react-query';

import { directus, type Quote } from '@/lib/directus';

// Every field the wizard needs to rebuild a draft. Line items aren't fetched:
// they're derived output (the material package is rebuilt deterministically
// from tier + area, and the labour line from days × rate), so re-reading them
// would just risk showing something inconsistent with the inputs.
const QUOTE_DETAIL_FIELDS = [
  'id',
  'customer_name',
  'job_type',
  'length',
  'width',
  'height',
  'unit',
  'material_brief',
  'material_zip',
  'selected_tier',
  'materials_total',
  'labour_days',
  'labour_day_rate',
  'labour_total',
  'grand_total',
  'status',
] as const;

// One saved quote by id, for editing. Scoped server-side — requesting another
// user's id 403s on the `user_created = $CURRENT_USER` filter rather than
// returning anything.
export function useQuote(id: number | null) {
  return useQuery({
    queryKey: ['quotes', 'detail', id],
    enabled: id !== null,
    // Always refetch when opening the editor: a stale cached copy would
    // silently overwrite newer values on save.
    staleTime: 0,
    queryFn: () =>
      directus.request(
        readItem('quotes', id as number, { fields: [...QUOTE_DETAIL_FIELDS] }),
      ) as Promise<Quote>,
  });
}
