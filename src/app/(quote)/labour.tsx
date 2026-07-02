import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LABOUR_RATE_PRESETS, formatMoney } from '@/constants/quote';
import { Accent, Spacing } from '@/constants/theme';
import { getLabourTotal, useQuoteDraft } from '@/context/quote-draft';
import { useLabourRates } from '@/hooks/use-labour-rates';
import { useTheme } from '@/hooks/use-theme';

// Step 4 — Labour. Priced as days on site × a daily rate (USD). Days use a
// tactile stepper; the rate has quick-pick presets plus a custom field, with a
// live total so the cost updates as they go.
export default function LabourScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useQuoteDraft();

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
      {/* Days on site — a -/+ stepper. */}
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold">Days on site</ThemedText>
        <ThemedView type="backgroundElement" style={styles.stepper}>
          <StepperButton label="−" onPress={() => setDays(days - 1)} disabled={days <= 0} />
          <View style={styles.stepperValue}>
            <ThemedText type="subtitle">{days}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {days === 1 ? 'day' : 'days'}
            </ThemedText>
          </View>
          <StepperButton label="+" onPress={() => setDays(days + 1)} />
        </ThemedView>
      </ThemedView>

      {/* Daily rate — quick-pick presets plus a custom field. */}
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold">Daily rate</ThemedText>
        {ratesQuery.isLoading ? (
          <ThemedView style={styles.chipLoading}>
            <ActivityIndicator />
            <ThemedText type="small" themeColor="textSecondary">
              Loading rates…
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.chipRow}>
            {ratePresets.map((preset) => {
              const selected = String(preset) === draft.labourDayRate;
              return (
                <Pressable
                  key={preset}
                  onPress={() => updateDraft({ labourDayRate: String(preset) })}>
                  <ThemedView
                    type={selected ? 'backgroundSelected' : 'backgroundElement'}
                    style={styles.chip}>
                    <ThemedText type="small">{formatMoney(preset)}/day</ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </ThemedView>
        )}
        {/* Only badge the fallback as "offline" when the fetch actually failed;
            an empty-but-reachable collection just silently shows the defaults. */}
        {ratesQuery.isError && (
          <ThemedText type="small" themeColor="textSecondary">
            Offline — showing default rates.
          </ThemedText>
        )}
        <RateField
          value={draft.labourDayRate}
          onChangeText={(labourDayRate) => updateDraft({ labourDayRate })}
        />
      </ThemedView>

      {/* Live labour total, mirroring the floor-area card on the Dimensions step. */}
      {labourTotal > 0 && (
        <ThemedView type="backgroundElement" style={styles.totalCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Estimated labour
          </ThemedText>
          <ThemedText type="subtitle" style={{ color: Accent }}>
            {formatMoney(labourTotal)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {days} {days === 1 ? 'day' : 'days'} × {formatMoney(rate)}/day
          </ThemedText>
        </ThemedView>
      )}
    </QuoteStepScreen>
  );
}

// Round -/+ control for the day stepper.
function StepperButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}>
      <ThemedView type="backgroundSelected" style={styles.stepperButton}>
        <ThemedText type="subtitle">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

// Custom daily-rate input with a leading "$".
function RateField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.inputRow}>
      <ThemedText type="small" themeColor="textSecondary">
        $
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="Custom rate"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
      />
      <ThemedText type="small" themeColor="textSecondary">
        / day
      </ThemedText>
    </ThemedView>
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
    borderRadius: Spacing.three,
  },
  stepperValue: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    borderRadius: Spacing.five,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  totalCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
