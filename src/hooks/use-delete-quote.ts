import { deleteItem, deleteItems, readItems } from '@directus/sdk';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { directus } from '@/lib/directus';

// Delete a quote and its line items.
//
// Items are removed **explicitly, first**, rather than relying on the database
// to cascade. The `quote_items.quote` relation's on-delete behaviour isn't
// something the client can read (`/relations` is admin-only), and if it's SET
// NULL rather than CASCADE the items would survive as orphans with a null
// parent — invisible to everyone, since the read filter scopes through
// `quote.user_created`, and therefore impossible to clean up from the app.
// Deleting them ourselves makes the outcome the same either way.
//
// Ordering is the opposite of the edit flow's for the same reason: there, a
// half-finished write should leave too much rather than too little; here the
// quote row is the thing that must not survive without its items, and a failure
// between the two steps leaves a quote with no items, which the user can see and
// retry. Both requests are owner-scoped server-side.
export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const items = (await directus.request(
        readItems('quote_items', { filter: { quote: { _eq: id } }, fields: ['id'], limit: -1 }),
      )) as { id: number }[];

      if (items.length > 0) {
        await directus.request(
          deleteItems(
            'quote_items',
            items.map((row) => row.id),
          ),
        );
      }

      await directus.request(deleteItem('quotes', id));
      return { id };
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.removeQueries({ queryKey: ['quotes', 'detail', id] });
    },
  });
}
