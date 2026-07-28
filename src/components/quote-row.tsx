import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatAmount } from '@/constants/quote';
import { Spacing } from '@/constants/theme';
import { type RecentQuote } from '@/hooks/use-recent-quotes';

// The quote's display name: whatever the user called it, else the room type,
// else a neutral fallback for rows saved without either. Exported so the rename
// dialog can title itself with the same string the list shows.
export function quoteLabel(quote: RecentQuote): string {
  return quote.customer_name?.trim() || quote.job_type || 'Quote';
}

// One saved-quote row, shared by the Home tab (5 newest) and the Quotes tab
// (all of them): name on the left over its metadata, total on the right. Rows
// can be sparse (null dims / totals / name), so every fragment degrades
// gracefully.
//
// Deliberately fully neutral — no accent, no badge fill. A list is the one place
// where "one accent element per screen" would be violated N times over, and a
// column of orange totals reads as noise rather than emphasis. Separation
// between rows is the caller's job (interleave <Divider />), so the row itself
// stays composable.
export function QuoteRow({ quote, onPress }: { quote: RecentQuote; onPress?: () => void }) {
  // Area is derived, and only shown when both dimensions were saved.
  const area = quote.length !== null && quote.width !== null ? quote.length * quote.width : null;

  // When a custom name is showing, the room type moves down into the metadata
  // so it isn't lost — otherwise the metadata is just size and date.
  const named = !!quote.customer_name?.trim();
  const meta = [
    named ? quote.job_type : null,
    area !== null ? `${area.toLocaleString()} ${quote.unit}²` : null,
    formatDate(quote.date_created),
  ]
    .filter(Boolean)
    .join(' · ');

  const body = (
    <View style={styles.row}>
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <ThemedText type="bodyBold" numberOfLines={1} style={styles.title}>
            {quoteLabel(quote)}
          </ThemedText>
          {quote.status !== 'final' && <ThemedText type="label">Draft</ThemedText>}
        </View>
        <ThemedText type="label">{meta}</ThemedText>
      </View>
      {/* Bare figure — currency is established once in the list header. */}
      <ThemedText type="bodyBold" tabular>
        {formatAmount(quote.grand_total ?? 0)}
      </ThemedText>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Rename ${quoteLabel(quote)}`}
      style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
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
  main: {
    flex: 1,
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.5,
  },
});
