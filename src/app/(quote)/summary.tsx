import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatMoney } from '@/constants/quote';
import { type MaterialLineItem } from '@/constants/materials-mock';
import { Accent, Spacing } from '@/constants/theme';
import {
  getArea,
  getLabourTotal,
  getMaterialsTotal,
  getQuoteTotal,
  getSelectedPackage,
  useQuoteDraft,
} from '@/context/quote-draft';
import { useSaveQuote } from '@/hooks/use-save-quote';
import { useTheme } from '@/hooks/use-theme';
import { buildQuotePayload } from '@/lib/quote-payload';

// Step 5 — Quote summary. A receipt-style breakdown of everything the user
// entered: a job recap, the chosen material package's line items, the labour
// line, and a headline grand total. Read-only — no buy links here, just the
// numbers. Done persists the quote to Directus (as a draft unless "Mark as
// final" is on), then clears the local draft and returns home.
export default function SummaryScreen() {
  const router = useRouter();
  const { draft, reset } = useQuoteDraft();
  const saveQuote = useSaveQuote();
  // Quotes save as 'draft' unless the user explicitly marks this one final.
  const [markFinal, setMarkFinal] = useState(false);

  const area = getArea(draft);
  const pkg = getSelectedPackage(draft);
  const materialsTotal = getMaterialsTotal(draft);
  const labourTotal = getLabourTotal(draft);
  const total = getQuoteTotal(draft);

  const days = parseInt(draft.labourDays || '0', 10) || 0;
  const rate = parseFloat(draft.labourDayRate);

  // Clear the draft and unwind the whole modal flow back to the home tab.
  function leave() {
    reset();
    router.dismissTo('/');
  }

  // Done → persist to Directus, then leave. On failure the quote isn't lost
  // silently: the user chooses between retrying and finishing unsaved.
  function finish() {
    saveQuote.mutate(buildQuotePayload(draft, markFinal ? 'final' : 'draft'), {
      onSuccess: leave,
      onError: () => {
        Alert.alert("Couldn't save quote", 'Check your connection and try again.', [
          { text: 'Retry', onPress: finish },
          { text: 'Finish without saving', style: 'destructive', onPress: leave },
          { text: 'Cancel', style: 'cancel' },
        ]);
      },
    });
  }

  return (
    <QuoteStepScreen
      step={5}
      overline={draft.jobType ?? 'New quote'}
      title="Your quote"
      description="A rough estimate based on what you entered."
      footer={
        <StepFooter
          primaryLabel={saveQuote.isPending ? 'Saving…' : 'Done'}
          primaryDisabled={saveQuote.isPending}
          onPrimary={finish}
          onBack={() => router.back()}
        />
      }>
      {/* Job recap — room + floor area for context. */}
      <ThemedView type="backgroundElement" style={styles.recapCard}>
        <ThemedText type="small" themeColor="textSecondary">
          {draft.jobType ?? 'New quote'}
        </ThemedText>
        {area !== null && (
          <ThemedText type="subtitle">
            {area.toLocaleString()} {draft.unit}²
          </ThemedText>
        )}
      </ThemedView>

      {/* Materials — the chosen package's itemized lines + subtotal. */}
      <Section title="Materials" subtotal={materialsTotal}>
        {pkg ? (
          <View style={styles.lines}>
            <ThemedText type="small" themeColor="textSecondary">
              {pkg.title} package
            </ThemedText>
            {pkg.items.map((item) => (
              <SummaryLine key={item.name} item={item} />
            ))}
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No materials selected.
          </ThemedText>
        )}
      </Section>

      {/* Labour — a single days × rate line. */}
      <Section title="Labour" subtotal={labourTotal}>
        {labourTotal > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {days} {days === 1 ? 'day' : 'days'} × {formatMoney(rate)}/day
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No labour added.
          </ThemedText>
        )}
      </Section>

      {/* Grand total — the headline of the screen. */}
      <ThemedView type="backgroundElement" style={styles.totalCard}>
        <ThemedText type="small" themeColor="textSecondary">
          Estimated total
        </ThemedText>
        <ThemedText type="title" style={{ color: Accent }}>
          {formatMoney(total)}
        </ThemedText>
      </ThemedView>

      {/* Save-as toggle — quotes stay drafts unless the user calls this one done. */}
      <ThemedView type="backgroundElement" style={styles.finalRow}>
        <View style={styles.finalLabel}>
          <ThemedText type="smallBold">Mark as final</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {markFinal ? 'Saved as a final quote' : 'Saved as a draft'}
          </ThemedText>
        </View>
        <Switch value={markFinal} onValueChange={setMarkFinal} trackColor={{ true: Accent }} />
      </ThemedView>

      <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
        Rough estimate{pkg ? ` · approximate material prices as of ${formatDate(pkg.pricedAt)}` : ''}
      </ThemedText>
    </QuoteStepScreen>
  );
}

// A titled block with a right-aligned subtotal in the header, then its body.
function Section({
  title,
  subtotal,
  children,
}: {
  title: string;
  subtotal: number;
  children: React.ReactNode;
}) {
  return (
    <ThemedView style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="smallBold">{formatMoney(subtotal)}</ThemedText>
      </View>
      {children}
    </ThemedView>
  );
}

// One read-only material line: name + quantity on the left, price on the right.
function SummaryLine({ item }: { item: MaterialLineItem }) {
  const theme = useTheme();
  return (
    <View style={[styles.line, { borderTopColor: theme.backgroundSelected }]}>
      <View style={styles.lineName}>
        <ThemedText type="small">{item.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.quantity}
        </ThemedText>
      </View>
      <ThemedText type="small">{formatMoney(item.price)}</ThemedText>
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  recapCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.three,
  },
  lines: {
    gap: Spacing.two,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  lineName: {
    flex: 1,
    gap: Spacing.half,
  },
  totalCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
  finalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  finalLabel: {
    gap: Spacing.half,
    flex: 1,
  },
  disclaimer: {
    textAlign: 'center',
  },
});
