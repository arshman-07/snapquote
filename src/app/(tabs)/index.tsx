import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/button';
import { Led } from '@/components/led';
import { Panel } from '@/components/panel';
import { QuoteListPanel } from '@/components/quote-list';
import { formatDate, quoteLabel } from '@/components/quote-row';
import { Readout, ReadoutText } from '@/components/readout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatMoney } from '@/constants/quote';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useRecentQuotes } from '@/hooks/use-recent-quotes';

// Home tab — the app's landing screen, laid out like the front of a device:
// a nameplate strip, the headline, then the main "control module" (a screen
// showing the latest quote above the red Start key), then the five most recent
// saved quotes from Directus (auto-refreshed on save; pull down to refetch).
//
// "Start a new quote" is the one accent key on the screen — everything else is
// grey plastic so nothing competes with it.
export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const quotesQuery = useRecentQuotes();
  const quotes = quotesQuery.data ?? [];
  const latest = quotes[0];

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
          {/* Nameplate strip. Sign out is a flat ghost key — a rare action that
              shouldn't read as a real button next to the Start key. */}
          <View style={styles.plate}>
            <Led tone="accent" label="SnapQuote" />
            <TextButton label="Sign out" onPress={() => signOut()} />
          </View>

          <ThemedText type="title">Quick quotes for construction jobs.</ThemedText>

          {/* The control module: the latest quote on the screen, and the key
              that starts the next one. */}
          <Panel elevated vents style={styles.module}>
            <Readout>
              <ReadoutText variant="label">Latest quote</ReadoutText>
              {quotesQuery.isLoading ? (
                <ReadoutText>Loading…</ReadoutText>
              ) : latest ? (
                <>
                  {/* Standalone figure with no USD header above it, so it
                      carries its own "$". */}
                  <ReadoutText variant="figure" numberOfLines={1} adjustsFontSizeToFit>
                    {formatMoney(latest.grand_total ?? 0)}
                  </ReadoutText>
                  <ReadoutText numberOfLines={1}>
                    {quoteLabel(latest)} · {formatDate(latest.date_created)}
                  </ReadoutText>
                </>
              ) : (
                <>
                  <ReadoutText variant="figure">— — —</ReadoutText>
                  <ReadoutText>{quotesQuery.isError ? 'No data' : 'No quotes yet'}</ReadoutText>
                </>
              )}
            </Readout>

            <PrimaryButton label="Start a new quote" onPress={() => router.push('/new-quote')} />
          </Panel>

          <QuoteListPanel
            label="Recent quotes"
            quotes={quotes}
            isLoading={quotesQuery.isLoading}
            isError={quotesQuery.isError}
            errorText="Couldn't load recent quotes — pull down to retry."
            emptyText="No quotes yet — start one above."
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
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.five,
  },
  plate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // The ghost key has its own padding; pull it flush with the gutter.
    marginRight: -Spacing.three,
    marginBottom: -Spacing.four,
  },
  module: {
    gap: Spacing.four,
    // Clear the vent slots in the top-right corner.
    paddingTop: Spacing.five + Spacing.two,
  },
});
