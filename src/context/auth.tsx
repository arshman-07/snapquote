import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { registerUser } from '@directus/sdk';

import { authStorage } from '@/lib/auth-storage';
import { directus } from '@/lib/directus';
import { queryClient, setSessionExpiredHandler } from '@/lib/query';

// Session state for the whole app. The root layout renders the login gate off
// `status`, so everything below it can assume a signed-in Directus client.
//
// 'restoring' — launch: deciding whether the persisted refresh token is still
//               good. The root layout holds the splash until this resolves.
// 'signedIn'  — the SDK client holds a live session; requests carry the token.
// 'signedOut' — no session; the gate shows the (auth) group.
type AuthStatus = 'restoring' | 'signedIn' | 'signedOut';

type AuthContextValue = {
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Directus HTTP errors surface as `{ errors: [...] }`; anything else (fetch
// TypeError etc.) is a network problem. The distinction decides whether a
// failed launch-refresh discards the stored token or keeps it for next time.
function isServerRejection(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'errors' in error;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring');

  // Session restore on launch. The SDK never refreshes by itself from a cold
  // start (no expires_at in storage), so we do it explicitly here.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      // No persisted refresh token (fresh install / after logout): skip the
      // doomed network round-trip.
      const stored = await authStorage.get();
      if (!stored?.refresh_token) {
        if (!cancelled) setStatus('signedOut');
        return;
      }

      try {
        await directus.refresh();
        if (!cancelled) setStatus('signedIn');
      } catch (error) {
        // Server said no → token is dead, drop it. Network failure → keep the
        // token so the next launch can retry, but still gate to login (we
        // can't make authenticated requests without an access token anyway).
        if (isServerRejection(error)) await authStorage.set(null);
        if (!cancelled) setStatus('signedOut');
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Throws on bad credentials — the login screen catches and displays it.
    await directus.login({ email, password });
    // Anything fetched anonymously (or by a previous user) is stale now.
    queryClient.clear();
    setStatus('signedIn');
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    // Two steps: /users/register creates the account but returns no session,
    // so we immediately sign in with the same credentials to get tokens and
    // flip the gate. `registerUser` throws if public registration is disabled
    // server-side; the sign-up screen maps that. Note Directus returns 204
    // even when the email already exists (anti-enumeration) — in that case the
    // register no-ops and the login below fails, which the screen surfaces.
    await directus.request(registerUser(email, password));
    await directus.login({ email, password });
    // Nothing has been fetched under this identity yet, but clear for parity
    // with signIn (drops anything cached anonymously).
    queryClient.clear();
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Best effort: invalidates the refresh token server-side and clears the
      // adapter via the SDK. Offline it throws — we still sign out locally.
      await directus.logout();
    } catch {
      // Server unreachable or token already dead; local cleanup below.
    } finally {
      await authStorage.set(null);
      queryClient.clear();
      setStatus('signedOut');
    }
  }, []);

  // Bounce a dead session to the login gate. The query layer calls this when an
  // authenticated data request fails with an auth error (revoked/expired token
  // that autoRefresh couldn't save). Registered only while signedIn: during
  // 'restoring' the restore effect owns refresh failures, and 'signedOut' has
  // nowhere to go.
  useEffect(() => {
    if (status !== 'signedIn') return;
    setSessionExpiredHandler(() => {
      void signOut();
    });
    return () => setSessionExpiredHandler(null);
  }, [status, signOut]);

  // Re-validate the session whenever the app returns to the foreground. Access
  // tokens are stateless JWTs that stay valid until they expire, so a session
  // revoked server-side (password changed, account removed) keeps working until
  // then; refreshing on foreground catches it promptly instead of waiting for
  // the access token's TTL. Only a server rejection (dead refresh token) signs
  // out — a network failure leaves the session in place to retry later. Runs
  // only while signedIn.
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    if (status !== 'signedIn') return;
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      // Only act on an actual return to the foreground (background/inactive →
      // active), not on every transition.
      if (next !== 'active' || prev === 'active') return;
      directus.refresh().catch((error) => {
        if (isServerRejection(error)) void signOut();
      });
    });
    return () => sub.remove();
  }, [status, signOut]);

  const value = useMemo(
    () => ({ status, signIn, signUp, signOut }),
    [status, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider.');
  return ctx;
}
