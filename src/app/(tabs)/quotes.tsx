import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuoteList } from '@/components/quote-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CURRENCY_CODE } from '@/constants/quote';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAllQuotes } from '@/hooks/use-all-quotes';

// Quotes tab — the full history of saved quotes, newest first (Home shows only
// the five most recent). Same row + data shape as Home; the list just isn't
// capped. Loading / error / empty states mirror Home, and pull-to-refresh
// refetches. No mock fallback: an error says so rather than inventing history.
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

          <View style={styles.section}>
            {quotes.length > 0 && (
              <View style={styles.sectionHeader}>
                <ThemedText type="label">All quotes</ThemedText>
                <ThemedText type="label">{CURRENCY_CODE}</ThemedText>
              </View>
            )}

            {quotesQuery.isLoading ? (
              <View style={styles.listStatus}>
                <ActivityIndicator />
              </View>
            ) : quotesQuery.isError ? (
              <ThemedText type="caption">
                Couldn&apos;t load your quotes — pull down to retry.
              </ThemedText>
            ) : quotes.length > 0 ? (
              <QuoteList quotes={quotes} />
            ) : (
              <ThemedText type="caption">No quotes yet — start one from the Home tab.</ThemedText>
            )}
          </View>
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
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.five,
  },
  header: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.one,
  },
  listStatus: {
    paddingVertical: Spacing.three,
    alignItems: 'flex-start',
  },
});
