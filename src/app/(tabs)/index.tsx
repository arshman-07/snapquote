import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatMoney } from '@/constants/quote';
import { RECENT_QUOTES, type RecentQuote } from '@/constants/recent-quotes-mock';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Home tab — the app's landing screen. A short brand header, the primary entry
// point into the quote flow, and a list of recently created quotes. Phase 1:
// the recent list is static mock data (see recent-quotes-mock.ts); Phase 2 will
// swap it for a Directus query without changing this UI.
export default function HomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
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

          {/* Recent quotes — static Phase-1 placeholders. */}
          <View style={styles.section}>
            <ThemedText type="smallBold">Recent quotes</ThemedText>
            {RECENT_QUOTES.length > 0 ? (
              <ThemedView type="backgroundElement" style={styles.list}>
                {RECENT_QUOTES.map((quote, index) => (
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

// One recent-quote row: job type + area/date on the left, total on the right.
// A hairline top border separates rows (skipped on the first).
function RecentQuoteRow({ quote, first }: { quote: RecentQuote; first: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected },
      ]}>
      <View style={styles.rowMain}>
        <ThemedText type="small">{quote.jobType}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {quote.area.toLocaleString()} {quote.unit}² · {formatDate(quote.dateISO)}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={{ color: Accent }}>
        {formatMoney(quote.total)}
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
});
