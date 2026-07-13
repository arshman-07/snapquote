import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatMoney } from '@/constants/quote';
import { Accent, Spacing } from '@/constants/theme';
import { type RecentQuote } from '@/hooks/use-recent-quotes';
import { useTheme } from '@/hooks/use-theme';

// One saved-quote row, shared by the Home tab (5 newest) and the Quotes tab
// (all of them): job type + area/date on the left, total on the right, with a
// "Draft" tag on anything not marked final. Rows can be sparse (null dims /
// totals), so every fragment degrades gracefully. A hairline top border
// separates rows (skipped on the first).
export function QuoteRow({ quote, first }: { quote: RecentQuote; first: boolean }) {
  const theme = useTheme();
  // Area is derived, and only shown when both dimensions were saved.
  const area = quote.length !== null && quote.width !== null ? quote.length * quote.width : null;
  return (
    <View
      style={[
        styles.row,
        !first && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.backgroundSelected,
        },
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

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
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
});
