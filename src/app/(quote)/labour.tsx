import { useRouter } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Key } from '@/components/button';
import { Chip } from '@/components/chip';
import { Field } from '@/components/field';
import { Panel } from '@/components/panel';
import { QuoteStepScreen } from '@/components/quote-step-screen';
import { Readout, ReadoutText } from '@/components/readout';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { CURRENCY_CODE, LABOUR_RATE_PRESETS, formatAmount, formatMoney } from '@/constants/quote';
import { Radius, Spacing } from '@/constants/theme';
import { getLabourTotal, useQuoteDraft } from '@/context/quote-draft';
import { useLabourRates } from '@/hooks/use-labour-rates';
import { useShadows, useTheme } from '@/hooks/use-theme';

// Step 4 — Labour. Priced as days on site × a daily rate (USD). Days use a
// physical stepper (two round keys either side of a recessed counter window);
// the rate has latching quick-pick chips plus a custom field, and the running
// labour total lights up on a readout screen as they go.
//
// Currency is stated once in the "Daily rate" label, so the chips and field
// below it are bare; the readout stands alone, so it carries its own "$".
export default function LabourScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useQuoteDraft();
  const theme = useTheme();
  const shadows = useShadows();

  // Quick-pick rates come from Directus. On error/offline — or an empty,
  // unseeded collection — fall back to the static presets so the step always
  // offers sensible chips. The custom rate field works regardless.
  const ratesQuery = useLabourRates();
  const liveRates = ratesQuery.data?.map((r) => r.daily_rate) ?? [];
  const usingFallback = ratesQuery.isError || (ratesQuery.isSuccess && liveRates.length === 0);
  const ratePresets: readonly number[] = usingFallback ? LABOUR_RATE_PRESETS : liveRates;

  const days = parseInt(draft.labourDays || '0', 10) || 0;
  const rate = parseFloat(draft.labourDayRate);
  const labourTotal = getLabourTotal(draft);

  // Both pieces are required before moving on, matching the other steps.
  const canContinue = days > 0 && rate > 0;

  // Stepper writes the day count straight back to the draft as a string.
  function setDays(next: number) {
    updateDraft({ labourDays: String(Math.max(0, next)) });
  }

  return (
    <QuoteStepScreen
      step={4}
      overline={draft.jobType ?? 'New quote'}
      title="Add labour"
      description="Roughly how many days on site, and your daily rate?"
      footer={
        <StepFooter
          primaryLabel="Continue"
          primaryDisabled={!canContinue}
          onPrimary={() => router.push('/summary')}
          onBack={() => router.back()}
        />
      }>
      {/* Days on site — the count is the loudest thing here, so it sits in its
          own recessed window between the two keys. */}
      <Panel style={styles.panel}>
        <ThemedText type="label">Days on site</ThemedText>
        <View style={styles.stepper}>
          <Key
            onPress={() => setDays(days - 1)}
            disabled={days <= 0}
            accessibilityLabel="One day fewer"
            faceStyle={styles.stepperKey}>
            <Minus size={22} strokeWidth={2} color={theme.ink} />
          </Key>
          <View
            style={[
              styles.counter,
              { backgroundColor: theme.background, boxShadow: shadows.recessed },
            ]}
            accessibilityLabel={`${days} ${days === 1 ? 'day' : 'days'}`}>
            <ThemedText type="display" tabular>
              {days}
            </ThemedText>
            <ThemedText type="label">{days === 1 ? 'day' : 'days'}</ThemedText>
          </View>
          <Key
            onPress={() => setDays(days + 1)}
            accessibilityLabel="One day more"
            faceStyle={styles.stepperKey}>
            <Plus size={22} strokeWidth={2} color={theme.ink} />
          </Key>
        </View>
      </Panel>

      {/* Daily rate — quick-pick chips plus a custom field. */}
      <View style={styles.section}>
        <ThemedText type="label">Daily rate ({CURRENCY_CODE})</ThemedText>
        {ratesQuery.isLoading ? (
          <View style={styles.chipLoading}>
            <ActivityIndicator />
            <ThemedText type="caption">Loading rates…</ThemedText>
          </View>
        ) : (
          <View style={styles.chipRow}>
            {ratePresets.map((preset) => (
              <Chip
                key={preset}
                label={`${formatAmount(preset)} / day`}
                selected={String(preset) === draft.labourDayRate}
                onPress={() => updateDraft({ labourDayRate: String(preset) })}
                tabular
              />
            ))}
          </View>
        )}
        {/* Only badge the fallback as "offline" when the fetch actually failed;
            an empty-but-reachable collection just silently shows the defaults. */}
        {ratesQuery.isError && <ThemedText type="caption">Offline — showing default rates.</ThemedText>}
        {/* No "$" prefix — the section label already states the currency. */}
        <Field
          label="Custom rate"
          value={draft.labourDayRate}
          onChangeText={(labourDayRate) => updateDraft({ labourDayRate })}
          keyboardType="decimal-pad"
          placeholder="0"
          suffix="/ day"
        />
      </View>

      {/* Live labour total, mirroring the floor-area readout on Dimensions. */}
      {labourTotal > 0 && (
        <Readout>
          <ReadoutText variant="label">Estimated labour</ReadoutText>
          <ReadoutText variant="figure" numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(labourTotal)}
          </ReadoutText>
          <ReadoutText>
            {days} {days === 1 ? 'day' : 'days'} × {formatMoney(rate)} / day
          </ReadoutText>
        </Readout>
      )}
    </QuoteStepScreen>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.three,
    // Clear the corner screws.
    paddingTop: Spacing.five,
  },
  section: {
    gap: Spacing.three,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stepperKey: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
  },
  counter: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Wide enough that neighbouring keys' shadows don't merge.
    gap: Spacing.three,
  },
  chipLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
