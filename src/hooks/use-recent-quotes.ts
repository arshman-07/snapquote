import { readItems } from '@directus/sdk';
import { useQuery } from '@tanstack/react-query';

import { directus } from '@/lib/directus';

// The slice of a quotes row the Home list renders. Everything except id/unit/
// date can be null — sparse rows exist (e.g. quotes finished without materials).
export type RecentQuote = {
  id: number;
  customer_name: string | null;
  job_type: string | null;
  length: number | null;
  width: number | null;
  unit: string;
  grand_total: number | null;
  date_created: string;
  status: 'draft' | 'final' | null;
};

// The field list both quote lists request. Shared so Home and the Quotes tab
// can't drift apart — and so adding a column is a one-line change here rather
// than a hunt through hooks. Must stay a subset of what the App User policy
// grants Read on, or Directus 403s the whole request.
export const QUOTE_LIST_FIELDS = [
  'id',
  'customer_name',
  'job_type',
  'length',
  'width',
  'unit',
  'grand_total',
  'date_created',
  'status',
] as const;

// The five most recent quotes, newest first, for the Home tab. Uses the
// ['quotes'] key that useSaveQuote invalidates, so finishing a quote refreshes
// this list automatically.
export function useRecentQuotes() {
  return useQuery({
    queryKey: ['quotes'],
    queryFn: () =>
      directus.request(
        readItems('quotes', {
          fields: [...QUOTE_LIST_FIELDS],
          sort: ['-date_created'],
          limit: 5,
        }),
      ) as Promise<RecentQuote[]>,
  });
}
