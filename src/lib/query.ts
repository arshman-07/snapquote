import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

// Callback the auth context registers so a dead session can drive the login
// gate. Kept as a module-level ref (rather than importing the auth context)
// because the QueryClient is created at module load, before React mounts —
// and importing auth here would be circular (auth.tsx already imports this).
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

// True when a thrown request error means the session is unrecoverable (as
// opposed to a validation/network error). Directus SDK v23 throws
// `{ errors: [{ extensions: { code } }] }`; these codes, or a raw 401, mean the
// access/refresh token is no longer good and the user must sign in again.
function isAuthError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  // Some transports attach the HTTP response; a 401 is unambiguous.
  const status = (error as { response?: { status?: number } }).response?.status;
  if (status === 401) return true;

  const errors = (error as { errors?: { extensions?: { code?: string } }[] }).errors;
  if (!Array.isArray(errors)) return false;
  return errors.some((e) => {
    const code = e?.extensions?.code;
    return (
      code === 'TOKEN_EXPIRED' ||
      code === 'INVALID_TOKEN' ||
      code === 'INVALID_CREDENTIALS'
    );
  });
}

// Route any auth failure from a query/mutation to the registered handler. Login
// and sign-up go through `directus.request` directly (not TanStack), so their
// expected credential errors never reach here — only failures on the app's
// authenticated data requests do.
function handleAuthError(error: unknown): void {
  if (isAuthError(error)) onSessionExpired?.();
}

// Shared TanStack Query client for the whole app. Reference data (like
// room_types) changes rarely, so we keep a generous staleTime to avoid
// refetching on every mount; individual queries can override as needed.
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthError }),
  mutationCache: new MutationCache({ onError: handleAuthError }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});
