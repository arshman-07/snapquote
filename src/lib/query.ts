import { QueryClient } from '@tanstack/react-query';

// Shared TanStack Query client for the whole app. Reference data (like
// room_types) changes rarely, so we keep a generous staleTime to avoid
// refetching on every mount; individual queries can override as needed.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});
