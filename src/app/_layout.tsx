import { QueryClientProvider } from '@tanstack/react-query';
// SDK 56+ : expo-router no longer depends on react-navigation, and app code may
// not import from `@react-navigation/*`. The themes and provider are re-exported
// from `expo-router` itself. (The `expo-router/react-navigation` compat entry
// also has them, but marks them deprecated for removal in a future SDK.)
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import React from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth';
import { useScheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/query';

// Navigation chrome painted in the chassis colours, so the gap revealed during
// a screen transition is grey plastic rather than a white/black flash.
const navigationThemes = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Colors.light.background,
      card: Colors.light.background,
      text: Colors.light.ink,
      border: Colors.light.hairline,
      primary: Colors.light.accent,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.dark.background,
      card: Colors.dark.background,
      text: Colors.dark.ink,
      border: Colors.dark.hairline,
      primary: Colors.dark.accent,
    },
  },
};

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
  const scheme = useScheme();

  // The type system is Inter + JetBrains Mono, one family per weight (see
  // `FontFamilies`). Only the weights the scale actually uses are bundled.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  // A font that fails to load shouldn't brick the app — fall through and let
  // the platform substitute its default face.
  const fontsReady = fontsLoaded || !!fontError;

  return (
    // QueryClientProvider sits above everything so any screen can use TanStack
    // Query to talk to Directus. AuthProvider sits above the navigator so the
    // gate (and any screen) can read the session.
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={navigationThemes[scheme]}>
          <AnimatedSplashOverlay />
          {/* Held back until the fonts are in, so no screen renders in the
              fallback face and then reflows. The splash overlay covers this. */}
          {fontsReady && <RootNavigator />}
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
