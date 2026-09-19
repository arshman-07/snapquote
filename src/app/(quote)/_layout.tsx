import { Stack, useGlobalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { QuoteDraftProvider, useQuoteDraft } from '@/context/quote-draft';
import { useQuote } from '@/hooks/use-quote';
import { draftFromQuote } from '@/lib/quote-payload';

// The multi-step quote wizard. Wrapping the inner Stack in QuoteDraftProvider
// gives every step a shared draft to read from and write to, so data
// accumulates across screens (dimensions → photo → materials → labour →
// summary) without threading params or pulling in a global store.
//
// Entered two ways:
//   /new-quote          — a blank draft (create)
//   /new-quote?id=123   — hydrated from a saved quote (edit)
//
// Screens are auto-registered from the route files in this folder; we only set
// shared options here. Each screen draws its own header, so headers are off.
export default function QuoteLayout() {
  return (
    <QuoteDraftProvider>
      <QuoteFlow />
    </QuoteDraftProvider>
  );
}

// Lives inside the provider so it can seed the draft. Holds the flow behind a
// spinner until an edited quote is loaded — rendering the steps first would
// briefly show an empty form and let the user start typing into a draft that's
// about to be replaced.
function QuoteFlow() {
  const params = useGlobalSearchParams<{ id?: string }>();
  const { editingId, hydrate } = useQuoteDraft();

  // Latch the id from the entry URL. Later steps (/photo, /materials, …) carry
  // no params, so reading it live would lose it the moment the user advances.
  //
  // Held in state rather than a ref because a ref may not be read or written
  // during render — with `reactCompiler` on, the compiler is free to memoize
  // around one. Setting state during render is the sanctioned alternative:
  // React discards this render and immediately re-runs the component with the
  // new value, before anything is committed. The `editId === null` guard is
  // what stops that from looping, and it preserves the original semantics —
  // latch the id the first time it is seen, on whichever render that happens,
  // rather than only on the first.
  const [editId, setEditId] = useState<number | null>(null);
  const parsedId = params.id ? Number(params.id) : NaN;
  if (editId === null && Number.isFinite(parsedId)) {
    setEditId(parsedId);
  }

  const quoteQuery = useQuote(editId);

  useEffect(() => {
    const quote = quoteQuery.data;
    if (quote && editingId !== quote.id) hydrate(draftFromQuote(quote), quote.id);
  }, [quoteQuery.data, editingId, hydrate]);

  const awaitingHydration = editId !== null && editingId !== editId;

  if (awaitingHydration) {
    return (
      <ThemedView style={styles.centre}>
        {quoteQuery.isError ? (
          <ThemedText type="caption">
            Couldn&apos;t open that quote — close and try again.
          </ThemedText>
        ) : (
          <ActivityIndicator />
        )}
      </ThemedView>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
});
