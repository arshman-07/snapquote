import { Stack } from 'expo-router';
import React from 'react';

import { QuoteDraftProvider } from '@/context/quote-draft';

// The multi-step quote wizard. Wrapping the inner Stack in QuoteDraftProvider
// gives every step a shared draft to read from and write to, so data
// accumulates across screens (dimensions → photo → materials → labour →
// summary) without threading params or pulling in a global store.
//
// Screens are auto-registered from the route files in this folder; we only set
// shared options here. Each screen draws its own header, so headers are off.
export default function QuoteLayout() {
  return (
    <QuoteDraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </QuoteDraftProvider>
  );
}
