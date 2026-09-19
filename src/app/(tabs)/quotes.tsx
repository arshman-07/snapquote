import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuoteListPanel } from '@/components/quote-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAllQuotes } from '@/hooks/use-all-quotes';

// Quotes tab — the full history of saved quotes, newest first (Home shows only
// the five most recent). Same panel, rows and states as Home via
// `QuoteListPanel`; the list just isn't capped. Pull down to refetch.
export default function QuotesScreen() {
  const quotesQuery = useAllQuotes();
  const quotes = quotesQuery.data ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={quotesQuery.isRefetching}
              onRefresh={() => quotesQuery.refetch()}
            />
          }>
          <View style={styles.header}>
            <ThemedText type="title">Quotes</ThemedText>
            <ThemedText themeColor="body">Every quote you&apos;ve saved.</ThemedText>
          </View>

          <QuoteListPanel
            label="All quotes"
            quotes={quotes}
            isLoading={quotesQuery.isLoading}
            isError={quotesQuery.isError}
            errorText="Couldn't load your quotes — pull down to retry."
            emptyText="No quotes yet — start one from the Home tab."
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    alignSelf: 'stretch',
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.five,
  },
  header: {
    gap: Spacing.two,
  },
});
