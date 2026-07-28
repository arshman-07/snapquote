import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Divider } from '@/components/divider';
import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { CURRENCY_CODE, LABOUR_RATE_PRESETS, formatAmount } from '@/constants/quote';
import { Radius, Spacing } from '@/constants/theme';
import { getLabourTotal, useQuoteDraft } from '@/context/quote-draft';
import { useLabourRates } from '@/hooks/use-labour-rates';
import { useTheme } from '@/hooks/use-theme';

// Step 4 — Labour. Priced as days on site × a daily rate (USD). Days use a
// tactile stepper; the rate has quick-pick presets plus a custom field, with a
// live total so the cost updates as they go.
//
// Currency is stated once in the "Daily rate" label, so every figure below it
// is bare and tabular.
export default function LabourScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useQuoteDraft();
  const theme = useTheme();

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
      {/* Days on site — a −/+ stepper. The count is the loudest thing here. */}
      <View style={styles.section}>
        <ThemedText type="label">Days on site</ThemedText>
        <View style={[styles.stepper, { borderColor: theme.hairline }]}>
          <StepperButton label="−" onPress={() => setDays(days - 1)} disabled={days <= 0} />
          <View style={styles.stepperValue}>
            <ThemedText type="display" tabular>
              {days}
            </ThemedText>
            <ThemedText type="label">{days === 1 ? 'day' : 'days'}</ThemedText>
          </View>
          <StepperButton label="+" onPress={() => setDays(days + 1)} />
        </View>
      </View>

      {/* Daily rate — quick-pick presets plus a custom field. */}
      <View style={styles.section}>
        <ThemedText type="label">Daily rate ({CURRENCY_CODE})</ThemedText>
        {ratesQuery.isLoading ? (
          <View style={styles.chipLoading}>
            <ActivityIndicator />
            <ThemedText type="caption">Loading rates…</ThemedText>
          </View>
        ) : (
          <View style={styles.chipRow}>
            {ratePresets.map((preset) => {
              const selected = String(preset) === draft.labourDayRate;
              return (
                <Pressable
                  key={preset}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => updateDraft({ labourDayRate: String(preset) })}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.ink : theme.surface,
                      borderColor: selected ? theme.ink : theme.hairline,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="body" themeColor={selected ? 'onInk' : 'body'} tabular>
                    {formatAmount(preset)} / day
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}
        {/* Only badge the fallback as "offline" when the fetch actually failed;
            an empty-but-reachable collection just silently shows the defaults. */}
        {ratesQuery.isError && <ThemedText type="caption">Offline — showing default rates.</ThemedText>}
        <RateField
          value={draft.labourDayRate}
          onChangeText={(labourDayRate) => updateDraft({ labourDayRate })}
        />
      </View>

      {/* Live labour total, mirroring the floor-area readout on Dimensions. */}
      {labourTotal > 0 && (
        <View style={styles.readout}>
          <Divider />
          <View style={styles.readoutBody}>
            <ThemedText type="label">Estimated labour</ThemedText>
            <ThemedText type="display" tabular>
              {formatAmount(labourTotal)}
            </ThemedText>
            <ThemedText type="caption" tabular>
              {days} {days === 1 ? 'day' : 'days'} × {formatAmount(rate)} / day
            </ThemedText>
          </View>
        </View>
      )}
    </QuoteStepScreen>
  );
}

// −/+ control for the day stepper.
function StepperButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.stepperButton,
        { borderColor: theme.hairline },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <ThemedText type="heading">{label}</ThemedText>
    </Pressable>
  );
}

// Custom daily-rate input. No "$" prefix — the section label already states the
// currency, and repeating it here would misalign the figure.
function RateField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="Custom rate"
        placeholderTextColor={theme.muted}
        style={[styles.input, { color: theme.ink }]}
      />
      <ThemedText type="body" themeColor="muted">
        / day
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepperValue: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chipLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 50,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 17,
  },
  readout: {
    gap: Spacing.three,
  },
  readoutBody: {
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.35,
  },
});
