import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuoteRow } from '@/components/quote-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
          refreshControl={
            <RefreshControl
              refreshing={quotesQuery.isRefetching}
              onRefresh={() => quotesQuery.refetch()}
            />
          }>
          <View style={styles.header}>
            <ThemedText type="subtitle">Quotes</ThemedText>
            <ThemedText themeColor="textSecondary">
              Every quote you&apos;ve saved.
            </ThemedText>
          </View>

          {quotesQuery.isLoading ? (
            <View style={styles.listStatus}>
              <ActivityIndicator />
            </View>
          ) : quotesQuery.isError ? (
            <ThemedText type="small" themeColor="textSecondary">
              Couldn&apos;t load your quotes — pull down to retry.
            </ThemedText>
          ) : quotes.length > 0 ? (
            <ThemedView type="backgroundElement" style={styles.list}>
              {quotes.map((quote, index) => (
                <QuoteRow key={quote.id} quote={quote} first={index === 0} />
              ))}
            </ThemedView>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No quotes yet — start one from the Home tab.
            </ThemedText>
          )}
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
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  list: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  listStatus: {
    paddingVertical: Spacing.three,
    alignItems: 'flex-start',
  },
});
