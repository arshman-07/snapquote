import { createItem, createItems } from '@directus/sdk';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { directus } from '@/lib/directus';
import { type QuotePayload } from '@/lib/quote-payload';

// Persists a finished quote to Directus: first the quotes row, then its line
// items pointing at the new id (two sequential requests — the M2O direction
// makes this the simple path). Invalidates ['quotes'] so any recent-quotes
// list refetches.
export function useSaveQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quote, items }: QuotePayload) => {
      const created = await directus.request(createItem('quotes', quote));
      if (items.length > 0) {
        await directus.request(
          createItems(
            'quote_items',
            items.map((item) => ({ ...item, quote: created.id })),
          ),
        );
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}
