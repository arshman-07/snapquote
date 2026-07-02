import { readItems } from '@directus/sdk';
import { useQuery } from '@tanstack/react-query';

import { directus, type RoomType } from '@/lib/directus';

// Fetches the configurable list of room / job types from Directus. This is
// reference data that changes rarely, so it inherits the client's generous
// staleTime (see src/lib/query.ts). Only the fields the Dimensions step needs
// are requested, ordered by the collection's `sort`.
export function useRoomTypes() {
  return useQuery({
    queryKey: ['room_types'],
    queryFn: () =>
      directus.request(
        readItems('room_types', {
          fields: ['id', 'name', 'sort'],
          sort: ['sort'],
        }),
      ) as Promise<RoomType[]>,
  });
}
