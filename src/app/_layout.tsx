import { QueryClientProvider } from '@tanstack/react-query';
// SDK 56+ : expo-router no longer depends on react-navigation, and app code may
// not import from `@react-navigation/*`. The themes and provider are re-exported
// from `expo-router` itself. (The `expo-router/react-navigation` compat entry
// also has them, but marks them deprecated for removal in a future SDK.)
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/context/auth';
import { queryClient } from '@/lib/query';

// Root navigator. A Stack sits at the very top so the tab UI and the quote
// flow are siblings: the tabs live in `(tabs)`, and pushing into `(quote)`
// slides the wizard up over them. (Previously the tabs WERE the root, which
// left non-tab routes like the quote flow with nowhere to render.)
//
// The stack is split by auth: `(tabs)` + `(quote)` exist only with a session,
// `(auth)` only without one. Flipping the guards is the whole login gate —
// expo-router redirects to the first available screen and clears the dead
// group's history.
function RootNavigator() {
  const { status } = useAuth();

  // Still deciding whether the stored session is alive; don't flash the login
  // screen (or the tabs) in the meantime. The splash overlay covers this gap.
  if (status === 'restoring') return null;

  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        {/* The quote flow is presented as a modal stack over the tabs. */}
        <Stack.Screen name="(quote)" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    // QueryClientProvider sits above everything so any screen can use TanStack
    // Query to talk to Directus. AuthProvider sits above the navigator so the
    // gate (and any screen) can read the session.
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
