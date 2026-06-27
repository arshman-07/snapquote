import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, TextInput } from 'react-native';

import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { JOB_TYPES, UNITS, type Unit } from '@/constants/quote';
import { Spacing } from '@/constants/theme';
import { getArea, useQuoteDraft } from '@/context/quote-draft';
import { useTheme } from '@/hooks/use-theme';

// Step 1 — the starting point of a quote: which room, in what units, and how
// big. Everything is written straight into the shared draft so later steps can
// size up materials and labour from it.
export default function DimensionsScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useQuoteDraft();

  const area = getArea(draft);
  // Gate the Continue button on a chosen room and a real floor area.
  const canContinue = draft.jobType !== null && area !== null;

  return (
    <QuoteStepScreen
      step={1}
      overline={draft.jobType ?? 'New quote'}
      title="Measure the space"
      description="Pick the room and pop in its dimensions — we'll size up everything else from here."
      footer={
        <StepFooter
          primaryLabel="Continue"
          primaryDisabled={!canContinue}
          onPrimary={() => router.push('/photo')}
        />
      }>
      {/* Job / room type — selectable chips. */}
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold">Job type</ThemedText>
        <ThemedView style={styles.chipRow}>
          {JOB_TYPES.map((type) => {
            const selected = type === draft.jobType;
            return (
              <Pressable key={type} onPress={() => updateDraft({ jobType: type })}>
                <ThemedView
                  type={selected ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.chip}>
                  <ThemedText type="small">{type}</ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </ThemedView>
      </ThemedView>

      {/* Unit toggle (ft / m) — a small segmented control. */}
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold">Units</ThemedText>
        <ThemedView type="backgroundElement" style={styles.toggle}>
          {UNITS.map((u) => {
            const selected = u === draft.unit;
            return (
              <Pressable key={u} style={styles.toggleItem} onPress={() => updateDraft({ unit: u })}>
                <ThemedView
                  type={selected ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.toggleItemInner}>
                  <ThemedText type="small">{u}</ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </ThemedView>
      </ThemedView>

      {/* Dimensions. Height is optional — only some jobs need it. */}
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold">Dimensions ({draft.unit})</ThemedText>
        <DimensionField
          label="Length"
          value={draft.length}
          onChangeText={(length) => updateDraft({ length })}
          unit={draft.unit}
        />
        <DimensionField
          label="Width"
          value={draft.width}
          onChangeText={(width) => updateDraft({ width })}
          unit={draft.unit}
        />
        <DimensionField
          label="Height (optional)"
          value={draft.height}
          onChangeText={(height) => updateDraft({ height })}
          unit={draft.unit}
        />
      </ThemedView>

      {/* Live floor-area readout once length and width are valid. */}
      {area !== null && (
        <ThemedView type="backgroundElement" style={styles.areaCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Floor area
          </ThemedText>
          <ThemedText type="subtitle">
            {area.toLocaleString()} {draft.unit}²
          </ThemedText>
        </ThemedView>
      )}
    </QuoteStepScreen>
  );
}

// Single labelled dimension input. Numeric keyboard; the active unit sits in
// the field as a suffix.
function DimensionField({
  label,
  value,
  onChangeText,
  unit,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit: Unit;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {unit}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.half,
    alignSelf: 'flex-start',
  },
  toggleItem: {
    minWidth: 56,
  },
  toggleItemInner: {
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two + Spacing.half,
    alignItems: 'center',
  },
  field: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? Spacing.three : Spacing.two,
    fontSize: 16,
  },
  areaCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
});
