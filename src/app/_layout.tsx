import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

// Root navigator. A Stack sits at the very top so the tab UI and the quote
// flow are siblings: the tabs live in `(tabs)`, and pushing into `(quote)`
// slides the wizard up over them. (Previously the tabs WERE the root, which
// left non-tab routes like the quote flow with nowhere to render.)
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        {/* The quote flow is presented as a modal stack over the tabs. */}
        <Stack.Screen name="(quote)" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
