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

const REFRESH_TOKEN_KEY = 'snapquote.refresh_token';

async function readRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

async function writeRefreshToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return;
    if (token === null) localStorage.removeItem(REFRESH_TOKEN_KEY);
    else localStorage.setItem(REFRESH_TOKEN_KEY, token);
    return;
  }
  if (token === null) await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  else await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
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
    memory = value;
    // Persist only the refresh token; null (logout) clears it.
    await writeRefreshToken(value?.refresh_token ?? null);
  },
};
