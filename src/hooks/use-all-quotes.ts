import { readItems } from '@directus/sdk';
import { useQuery } from '@tanstack/react-query';

import { directus } from '@/lib/directus';
import { type RecentQuote } from '@/hooks/use-recent-quotes';

// Every saved quote, newest first, for the Quotes tab. Same row shape as the
// Home list. The key is ['quotes', 'all'] — a child of ['quotes'], which
// useSaveQuote invalidates, so TanStack Query's partial matching refreshes this
// list on save too. The limit is generous rather than paginated; revisit if a
// user ever accumulates hundreds of quotes.
export function useAllQuotes() {
  return useQuery({
    queryKey: ['quotes', 'all'],
    queryFn: () =>
      directus.request(
        readItems('quotes', {
          fields: ['id', 'job_type', 'length', 'width', 'unit', 'grand_total', 'date_created', 'status'],
          sort: ['-date_created'],
          limit: 100,
        }),
      ) as Promise<RecentQuote[]>,
  });
}
