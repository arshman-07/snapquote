import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatMoney } from '@/constants/quote';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useRecentQuotes, type RecentQuote } from '@/hooks/use-recent-quotes';
import { useTheme } from '@/hooks/use-theme';

// Home tab — the app's landing screen. A short brand header, the primary entry
// point into the quote flow, and the five most recent saved quotes from
// Directus (auto-refreshed when a new quote is saved; pull down to refetch).
export default function HomeScreen() {
  const router = useRouter();
  const quotesQuery = useRecentQuotes();
  const quotes = quotesQuery.data ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={quotesQuery.isRefetching}
              onRefresh={() => quotesQuery.refetch()}
            />
          }>
          {/* Brand header — replaces the Expo starter hero. */}
          <View style={styles.header}>
            <ThemedText type="title">SnapQuote</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Quick quotes for construction jobs.
            </ThemedText>
          </View>

          {/* Primary CTA — opens the dimensions-input step of the quote flow. */}
          <Pressable
            onPress={() => router.push('/new-quote')}
            style={({ pressed }) => pressed && styles.pressed}>
            <View style={styles.ctaButton}>
              <ThemedText type="smallBold" style={styles.ctaLabel}>
                Start a new quote
              </ThemedText>
            </View>
          </Pressable>

          {/* Recent quotes — live from Directus. No mock fallback here: fake
              quote history with fake totals would mislead, so errors just say so. */}
          <View style={styles.section}>
            <ThemedText type="smallBold">Recent quotes</ThemedText>
            {quotesQuery.isLoading ? (
              <View style={styles.listStatus}>
                <ActivityIndicator />
              </View>
            ) : quotesQuery.isError ? (
              <ThemedText type="small" themeColor="textSecondary">
                Couldn&apos;t load recent quotes — pull down to retry.
              </ThemedText>
            ) : quotes.length > 0 ? (
              <ThemedView type="backgroundElement" style={styles.list}>
                {quotes.map((quote, index) => (
                  <RecentQuoteRow key={quote.id} quote={quote} first={index === 0} />
                ))}
              </ThemedView>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                No quotes yet — start one above.
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// One recent-quote row: job type + area/date on the left, total on the right,
// with a "Draft" tag on anything not marked final. Rows can be sparse (null
// dims/totals), so every fragment degrades gracefully. A hairline top border
// separates rows (skipped on the first).
function RecentQuoteRow({ quote, first }: { quote: RecentQuote; first: boolean }) {
  const theme = useTheme();
  // Area is derived, and only shown when both dimensions were saved.
  const area = quote.length !== null && quote.width !== null ? quote.length * quote.width : null;
  return (
    <View
      style={[
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected },
      ]}>
      <View style={styles.rowMain}>
        <View style={styles.rowTitle}>
          <ThemedText type="small">{quote.job_type ?? 'Quote'}</ThemedText>
          {quote.status !== 'final' && (
            <ThemedView type="backgroundSelected" style={styles.draftTag}>
              <ThemedText type="small" themeColor="textSecondary">
                Draft
              </ThemedText>
            </ThemedView>
          )}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {area !== null ? `${area.toLocaleString()} ${quote.unit}² · ` : ''}
          {formatDate(quote.date_created)}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={{ color: Accent }}>
        {formatMoney(quote.grand_total ?? 0)}
      </ThemedText>
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  ctaButton: {
    backgroundColor: Accent,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  ctaLabel: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    gap: Spacing.two,
  },
  list: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowMain: {
    flex: 1,
    gap: Spacing.half,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  draftTag: {
    paddingHorizontal: Spacing.one + Spacing.half,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  listStatus: {
    paddingVertical: Spacing.three,
    alignItems: 'flex-start',
  },
});
