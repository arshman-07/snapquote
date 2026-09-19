import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Key } from '@/components/button';
import { Led } from '@/components/led';
import { ThemedText } from '@/components/themed-text';
import { formatAmount } from '@/constants/quote';
import { Radius, Spacing } from '@/constants/theme';
import { type RecentQuote } from '@/hooks/use-recent-quotes';
import { useTheme } from '@/hooks/use-theme';

// The quote's display name: whatever the user called it, else the room type,
// else a neutral fallback for rows saved without either. Exported so the rename
// dialog can title itself with the same string the list shows.
export function quoteLabel(quote: RecentQuote): string {
  return quote.customer_name?.trim() || quote.job_type || 'Quote';
}

// One saved-quote row, shared by the Home tab (5 newest) and the Quotes tab
// (all of them): name on the left over its stamped metadata, the total in mono
// on the right. Rows can be sparse (null dims / totals / name), so every
// fragment degrades gracefully.
//
// A tappable row is a ghost `Key`: flat on the panel at rest, it sinks into a
// recessed well (with a haptic click) while held. Drafts carry an amber LED so
// they can be spotted down a long list; finals carry nothing — the normal case
// shouldn't need a badge. Separation between rows is the caller's job
// (interleave <Divider />), so the row itself stays composable.
export function QuoteRow({ quote, onPress }: { quote: RecentQuote; onPress?: () => void }) {
  const theme = useTheme();

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
        <ThemedText type="bodyBold" numberOfLines={1}>
          {quoteLabel(quote)}
        </ThemedText>
        <View style={styles.metaRow}>
          {quote.status !== 'final' && <Led tone="warning" label="Draft" size={6} />}
          <ThemedText type="label" numberOfLines={1} style={styles.meta}>
            {meta}
          </ThemedText>
        </View>
      </View>
      {/* Bare figure — currency is established once in the list header. */}
      <ThemedText type="bodyBold" tabular>
        {formatAmount(quote.grand_total ?? 0)}
      </ThemedText>
      {onPress && <ChevronRight size={18} strokeWidth={1.5} color={theme.muted} />}
    </View>
  );

  if (!onPress) return body;

  return (
    <Key
      variant="ghost"
      onPress={onPress}
      accessibilityLabel={`Rename ${quoteLabel(quote)}`}
      // Bleed the pressed well slightly past the text so it doesn't hug it.
      style={styles.bleed}
      faceStyle={styles.face}>
      {body}
    </Key>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  main: {
    flex: 1,
    gap: Spacing.one,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  meta: {
    flexShrink: 1,
  },
  bleed: {
    marginHorizontal: -Spacing.two,
  },
  face: {
    alignItems: 'stretch',
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
  },
});
