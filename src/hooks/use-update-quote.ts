import { createItems, deleteItems, readItems, updateItem } from '@directus/sdk';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { directus } from '@/lib/directus';
import { type QuotePayload } from '@/lib/quote-payload';

// Patch just the name of an existing quote — what the rename dialog uses.
// Kept separate from the full edit because it's a single cheap request with no
// line-item churn.
//
// Row-level scoping does the authorising: the App User's `quotes` Update
// permission is filtered to `user_created = $CURRENT_USER`, so a PATCH against
// someone else's id 403s regardless of what the client sends. `customer_name`
// must also be in that permission's Update *field* list — field lists are
// allow-lists, and a missing one fails the whole write.
export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, customerName }: { id: number; customerName: string }) =>
      directus.request(
        updateItem('quotes', id, {
          // Empty input clears the name rather than storing '', so the fallback
          // to job_type stays a plain null check.
          customer_name: customerName.trim() || null,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

// Save an edited quote: patch the row, then replace its line items.
//
// Three requests with no transaction spanning them, so the ordering is
// deliberate — **create the new items before deleting the old ones**. A failure
// partway then leaves duplicates, which a retry cleans up, rather than a quote
// with no items at all, which nothing recovers. Duplicates are also low-impact
// today: totals are read off the quotes row, and saved items aren't rendered
// anywhere yet.
//
// Deleting the old items needs `quote_items` Delete scoped relationally
// (`quote.user_created = $CURRENT_USER`) — item-level scoping would hide any
// item created by someone else on this quote, so the delete would miss it and
// it would survive into the rewritten quote.
export function useEditQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quote, items }: QuotePayload & { id: number }) => {
      await directus.request(updateItem('quotes', id, quote));

      // Snapshot the existing item ids first: anything created below must not
      // end up in the delete set.
      const existing = (await directus.request(
        readItems('quote_items', { filter: { quote: { _eq: id } }, fields: ['id'], limit: -1 }),
      )) as { id: number }[];

      if (items.length > 0) {
        await directus.request(
          createItems(
            'quote_items',
            items.map((item) => ({ ...item, quote: id })),
          ),
        );
      }

      if (existing.length > 0) {
        await directus.request(
          deleteItems(
            'quote_items',
            existing.map((row) => row.id),
          ),
        );
      }

      return { id };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', 'detail', variables.id] });
    },
  });
}
