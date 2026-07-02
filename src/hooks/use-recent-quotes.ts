import { readItems } from '@directus/sdk';
import { useQuery } from '@tanstack/react-query';

import { directus } from '@/lib/directus';

// The slice of a quotes row the Home list renders. Everything except id/unit/
// date can be null — sparse rows exist (e.g. quotes finished without materials).
export type RecentQuote = {
  id: number;
  job_type: string | null;
  length: number | null;
  width: number | null;
  unit: string;
  grand_total: number | null;
  date_created: string;
  status: 'draft' | 'final' | null;
};

// The five most recent quotes, newest first, for the Home tab. Uses the
// ['quotes'] key that useSaveQuote invalidates, so finishing a quote refreshes
// this list automatically.
export function useRecentQuotes() {
  return useQuery({
    queryKey: ['quotes'],
    queryFn: () =>
      directus.request(
        readItems('quotes', {
          fields: ['id', 'job_type', 'length', 'width', 'unit', 'grand_total', 'date_created', 'status'],
          sort: ['-date_created'],
          limit: 5,
        }),
      ) as Promise<RecentQuote[]>,
  });
}
