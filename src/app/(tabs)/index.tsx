import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/button';
import { QuoteList } from '@/components/quote-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CURRENCY_CODE } from '@/constants/quote';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useRecentQuotes } from '@/hooks/use-recent-quotes';

// Home tab — the app's landing screen. Brand header, the primary entry point
// into the quote flow, and the five most recent saved quotes from Directus
// (auto-refreshed when a new quote is saved; pull down to refetch).
//
// Deliberately neutral end to end: no accent appears here at all. "Start a new
// quote" is the single most prominent element on the screen, and nothing else
// competes with it for attention.
export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
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
          {/* Brand header. Sign out recedes to a micro-label — it's a rare
              action and shouldn't read as a button next to the CTA. */}
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <ThemedText type="title">SnapQuote</ThemedText>
              <ThemedText themeColor="body">Quick quotes for construction jobs.</ThemedText>
            </View>
            <Pressable
              onPress={() => signOut()}
              hitSlop={Spacing.three}
              accessibilityRole="button"
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="label">Sign out</ThemedText>
            </Pressable>
          </View>

          <PrimaryButton label="Start a new quote" onPress={() => router.push('/new-quote')} />

          {/* Recent quotes — live from Directus. No mock fallback: fake quote
              history with fake totals would mislead, so errors just say so. */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="label">Recent quotes</ThemedText>
              {/* Currency stated once here so the rows can show bare figures. */}
              {quotes.length > 0 && <ThemedText type="label">{CURRENCY_CODE}</ThemedText>}
            </View>

            {quotesQuery.isLoading ? (
              <View style={styles.listStatus}>
                <ActivityIndicator />
              </View>
            ) : quotesQuery.isError ? (
              <ThemedText type="caption">
                Couldn&apos;t load recent quotes — pull down to retry.
              </ThemedText>
            ) : quotes.length > 0 ? (
              <QuoteList quotes={quotes} />
            ) : (
              <ThemedText type="caption">No quotes yet — start one above.</ThemedText>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  header: {
    flex: 1,
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
  pressed: {
    opacity: 0.5,
  },
});
