import { readItems } from '@directus/sdk';
import { useQuery } from '@tanstack/react-query';

import { directus, type LabourRate } from '@/lib/directus';

// Fetches the quick-pick daily labour rates from Directus, cheapest first.
// Reference data like room_types, so it inherits the client's generous
// staleTime (see src/lib/query.ts).
export function useLabourRates() {
  return useQuery({
    queryKey: ['labour_rates'],
    queryFn: () =>
      directus.request(
        readItems('labour_rates', {
          fields: ['id', 'daily_rate', 'currency'],
          sort: ['daily_rate'],
        }),
      ) as Promise<LabourRate[]>,
  });
}
