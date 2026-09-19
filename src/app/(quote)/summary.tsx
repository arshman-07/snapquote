import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { Divider } from '@/components/divider';
import { Field } from '@/components/field';
import { Led } from '@/components/led';
import { Panel } from '@/components/panel';
import { QuoteStepScreen } from '@/components/quote-step-screen';
import { Readout, ReadoutText } from '@/components/readout';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { CURRENCY_CODE, formatAmount } from '@/constants/quote';
import { type MaterialLineItem } from '@/constants/materials-mock';
import { Spacing } from '@/constants/theme';
import {
  getArea,
  getLabourTotal,
  getMaterialsTotal,
  getQuoteTotal,
  getSelectedPackage,
  useQuoteDraft,
} from '@/context/quote-draft';
import { useSaveQuote } from '@/hooks/use-save-quote';
import { useEditQuote } from '@/hooks/use-update-quote';
import { useTheme } from '@/hooks/use-theme';
import { buildQuotePayload } from '@/lib/quote-payload';

// Step 5 — Quote summary. A receipt-style breakdown of everything the user
// entered: a job recap, the chosen material package's line items, the labour
// line, and a headline grand total. Read-only — no buy links here, just the
// numbers. Done persists the quote to Directus (as a draft unless "Mark as
// final" is on), then clears the local draft and returns home.
//
// The breakdown is a printed receipt: one vented panel, grooves between its
// sections, every figure bare and in mono, and the grand total lit on a readout
// screen at the bottom. The currency is declared once, in the receipt header,
// so no line repeats a "$".
export default function SummaryScreen() {
  const router = useRouter();
  const { draft, updateDraft, reset, editingId } = useQuoteDraft();
  const theme = useTheme();
  const saveQuote = useSaveQuote();
  const editQuote = useEditQuote();
  // Editing an existing quote patches it in place; otherwise this creates one.
  const isEditing = editingId !== null;
  const saving = saveQuote.isPending || editQuote.isPending;

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
  // silently: the user chooses between retrying and leaving.
  function finish() {
    const payload = buildQuotePayload(draft);

    const onError = () => {
      Alert.alert(
        isEditing ? "Couldn't save changes" : "Couldn't save quote",
        'Check your connection and try again.',
        [
          { text: 'Retry', onPress: finish },
          {
            // Wording matters: on an edit the original quote still exists
            // untouched, so "discard changes" is accurate where "finish without
            // saving" would imply the whole quote is being thrown away.
            text: isEditing ? 'Discard changes' : 'Finish without saving',
            style: 'destructive',
            onPress: leave,
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    };

    if (isEditing) {
      editQuote.mutate({ id: editingId, ...payload }, { onSuccess: leave, onError });
    } else {
      saveQuote.mutate(payload, { onSuccess: leave, onError });
    }
  }

  // Job recap as a single metadata line — the step header already names the
  // room, so a separate recap card would just restate it.
  const recap = [draft.jobType, area !== null ? `${area.toLocaleString()} ${draft.unit}²` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <QuoteStepScreen
      step={5}
      overline={draft.jobType ?? 'New quote'}
      title="Your quote"
      description="A rough estimate based on what you entered."
      footer={
        <StepFooter
          primaryLabel={isEditing ? 'Save changes' : 'Done'}
          primaryLoading={saving}
          onPrimary={finish}
          onBack={() => router.back()}
        />
      }>
      {/* Optional label for the quote. Left blank, the lists fall back to the
          room type — so this never blocks finishing, and it can equally be set
          later by tapping the quote in Home or the Quotes tab. */}
      <Field
        label="Name this quote (optional)"
        value={draft.customerName}
        onChangeText={(customerName) => updateDraft({ customerName })}
        placeholder={draft.jobType ? `e.g. Mrs Patel — ${draft.jobType}` : 'e.g. Mrs Patel'}
        autoCapitalize="words"
        maxLength={120}
      />

      <Panel vents style={styles.breakdown}>
        {/* Currency is declared here, once, for every figure below. */}
        <View style={styles.breakdownHeader}>
          <ThemedText type="label">{recap || 'Breakdown'}</ThemedText>
          <ThemedText type="label">{CURRENCY_CODE}</ThemedText>
        </View>

        <Divider />

        {/* Materials — the chosen package's itemized lines + subtotal. */}
        <Section title="Materials" subtotal={materialsTotal}>
          {pkg ? (
            <View style={styles.lines}>
              <ThemedText type="caption">{pkg.title} package</ThemedText>
              {pkg.items.map((item) => (
                <SummaryLine key={item.name} item={item} />
              ))}
            </View>
          ) : (
            <ThemedText type="caption">No materials selected.</ThemedText>
          )}
        </Section>

        <Divider />

        {/* Labour — a single days × rate line. */}
        <Section title="Labour" subtotal={labourTotal}>
          {labourTotal > 0 ? (
            <ThemedText type="caption" tabular>
              {days} {days === 1 ? 'day' : 'days'} × {formatAmount(rate)} / day
            </ThemedText>
          ) : (
            <ThemedText type="caption">No labour added.</ThemedText>
          )}
        </Section>

        <Divider />

        {/* Grand total, lit on the receipt's readout. Bare figure — the USD
            in the receipt header covers it. */}
        <Readout minHeight={96}>
          <ReadoutText variant="label">Estimate · {CURRENCY_CODE}</ReadoutText>
          <ReadoutText variant="figure" numberOfLines={1} adjustsFontSizeToFit>
            {formatAmount(total)}
          </ReadoutText>
        </Readout>
      </Panel>

      {/* Save-as toggle — quotes stay drafts unless the user calls this one done.
          A status LED states what will be saved (amber draft / green final), in
          words as well as light. The switch is an interactive toggle, so it
          takes the accent when on. */}
      <View style={styles.finalRow}>
        <View style={styles.finalLabel}>
          <ThemedText type="bodyBold">Mark as final</ThemedText>
          <Led
            tone={draft.status === 'final' ? 'success' : 'warning'}
            label={draft.status === 'final' ? 'Saves as final' : 'Saves as draft'}
          />
        </View>
        <Switch
          value={draft.status === 'final'}
          onValueChange={(final) => updateDraft({ status: final ? 'final' : 'draft' })}
          trackColor={{ true: theme.accent, false: theme.recessed }}
          ios_backgroundColor={theme.recessed}
        />
      </View>

      <ThemedText type="caption" themeColor="muted" style={styles.disclaimer}>
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
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="label">{title}</ThemedText>
        <ThemedText type="bodyBold" tabular>
          {formatAmount(subtotal)}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

// One read-only material line: name + quantity on the left, price on the right.
function SummaryLine({ item }: { item: MaterialLineItem }) {
  return (
    <View style={styles.line}>
      <View style={styles.lineName}>
        <ThemedText type="body">{item.name}</ThemedText>
        <ThemedText type="label">{item.quantity}</ThemedText>
      </View>
      <ThemedText type="body" tabular>
        {formatAmount(item.price)}
      </ThemedText>
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  breakdown: {
    gap: Spacing.three,
    // Clear the vent slots in the top-right corner.
    paddingTop: Spacing.five + Spacing.two,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  lines: {
    gap: Spacing.three,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  lineName: {
    flex: 1,
    gap: Spacing.one,
  },
  finalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  finalLabel: {
    gap: Spacing.two,
    flex: 1,
  },
  disclaimer: {
    textAlign: 'center',
  },
});
