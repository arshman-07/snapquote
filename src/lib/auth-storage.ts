import type { AuthenticationData, AuthenticationStorage } from '@directus/sdk';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Storage adapter for the Directus SDK's authentication() composable.
//
// Security model (docs/SECURITY.md §2.3): only the long-lived refresh token is
// persisted to the device; the short-lived access token lives in memory only,
// so it never touches disk. After an app relaunch the memory cache is empty and
// `get()` returns just the refresh token — the auth context (step 2) calls
// `client.refresh()` on launch to trade it for a fresh access token.
//
// expo-secure-store has no web implementation (SDK 54 docs), so web falls back
// to localStorage. That's weaker (readable by any JS on the page), acceptable
// for the dev-oriented web target.
//
// expo-secure-store is documented to throw on a corrupted keystore or after an
// Android backup/restore onto a different device. Both read and write are
// wrapped so a storage-layer fault degrades gracefully instead of taking down
// whatever awaited `authStorage`: a failed read looks like "nothing stored"
// (signed out, recoverable by signing in again) and a failed write is
// reported to the caller rather than thrown, so `authStorage.set` below can
// still resolve and let its caller reach a terminal state.

const REFRESH_TOKEN_KEY = 'snapquote.refresh_token';

async function readRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.warn('SecureStore read failed; treating as no stored session:', error);
    return null;
  }
}

// Returns whether the write actually persisted. Never rejects — a keystore
// fault here must not propagate, since `set()`'s callers (sign-in, sign-out,
// launch restore) need it to always resolve so the app can reach a terminal
// auth state instead of hanging or throwing out of an effect.
async function writeRefreshToken(token: string | null): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return false;
    if (token === null) localStorage.removeItem(REFRESH_TOKEN_KEY);
    else localStorage.setItem(REFRESH_TOKEN_KEY, token);
    return true;
  }
  try {
    if (token === null) await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    else await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    return true;
  } catch (error) {
    // The in-memory session (set by the caller below) still works for the
    // rest of this run; only surviving a relaunch is lost.
    console.warn('SecureStore write failed; session will not survive relaunch:', error);
    return false;
  }
}

// Full auth data (incl. access token) for the current app session.
let memory: AuthenticationData | null = null;

export const authStorage: AuthenticationStorage = {
  async get() {
    if (memory) return memory;

    // Cold start: no session in memory yet. Surface the persisted refresh
    // token (if any) so `refresh()` can restore the session.
    const refreshToken = await readRefreshToken();
    if (!refreshToken) return null;
    return {
      access_token: null,
      refresh_token: refreshToken,
      expires: null,
      expires_at: null,
    };
  },

  async set(value) {
    // The in-memory copy is the source of truth for the running session —
    // update it unconditionally so the app keeps working even if the disk
    // write below fails.
    memory = value;
    // Persist only the refresh token; null (logout) clears it. Best-effort:
    // `writeRefreshToken` swallows its own errors, so a storage fault never
    // stops this from resolving.
    await writeRefreshToken(value?.refresh_token ?? null);
  },
};
