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

import { QuoteRow } from '@/components/quote-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useRecentQuotes } from '@/hooks/use-recent-quotes';

// Home tab — the app's landing screen. A short brand header, the primary entry
// point into the quote flow, and the five most recent saved quotes from
// Directus (auto-refreshed when a new quote is saved; pull down to refetch).
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
          {/* Brand header — replaces the Expo starter hero. Sign out sits
              top-right; it clears the session and the gate returns to login. */}
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <ThemedText type="title">SnapQuote</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                Quick quotes for construction jobs.
              </ThemedText>
            </View>
            <Pressable
              onPress={() => signOut()}
              hitSlop={Spacing.two}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.signOutButton}>
                <ThemedText type="small" themeColor="textSecondary">
                  Sign out
                </ThemedText>
              </ThemedView>
            </Pressable>
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
                  <QuoteRow key={quote.id} quote={quote} first={index === 0} />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  header: {
    flex: 1,
    gap: Spacing.one,
  },
  signOutButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
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
  listStatus: {
    paddingVertical: Spacing.three,
    alignItems: 'flex-start',
  },
});
