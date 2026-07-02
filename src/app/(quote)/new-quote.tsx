import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput } from 'react-native';

import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { JOB_TYPES, UNITS, type Unit } from '@/constants/quote';
import { Spacing } from '@/constants/theme';
import { useQuoteDraft } from '@/context/quote-draft';
import { useRoomTypes } from '@/hooks/use-room-types';
import { useTheme } from '@/hooks/use-theme';
import { dimensionsSchema, type DimensionsForm } from '@/lib/quote-schema';

// A room-type chip: server rows carry a Directus id; the offline fallback list
// has names only (id null), which is fine — an offline quote just can't record
// the stable reference.
type RoomTypeChip = { id: number | null; name: string };

// Validation error text colour — the theme has no dedicated error key, so keep
// it a single local constant (same spirit as Accent).
const ErrorColor = '#e5484d';

// Parse a dimension string to a positive number, else null (mirrors the schema).
function parseDimension(raw: string): number | null {
  const n = Number(raw.trim());
  return raw.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
}

// Step 1 — the starting point of a quote: which room, in what units, and how
// big. The form is validated with react-hook-form + zod (see quote-schema.ts);
// on a valid Continue we write everything into the shared draft so later steps
// can size up materials and labour from it.
export default function DimensionsScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useQuoteDraft();

  // Room types come from Directus. While loading we show a spinner; on error /
  // offline we fall back to the static list so a quote can always be started.
  const roomTypesQuery = useRoomTypes();
  const roomTypes: RoomTypeChip[] =
    roomTypesQuery.data?.map((rt) => ({ id: rt.id, name: rt.name })) ??
    JOB_TYPES.map((name) => ({ id: null, name }));
  const usingFallback = roomTypesQuery.isError;

  // RHF owns the form locally, seeded from the draft so values survive
  // back-navigation into this step. It only writes back to the shared draft on a
  // valid Continue.
  const { control, handleSubmit, watch, setValue, formState } = useForm<DimensionsForm>({
    resolver: zodResolver(dimensionsSchema),
    mode: 'onChange',
    defaultValues: {
      jobTypeId: draft.jobTypeId,
      jobType: draft.jobType ?? '',
      unit: draft.unit,
      length: draft.length,
      width: draft.width,
      height: draft.height,
    },
  });

  // Watched values drive this screen's live chrome (overline + area preview).
  const unit = watch('unit');
  const jobType = watch('jobType');
  const jobTypeId = watch('jobTypeId');
  const length = watch('length');
  const width = watch('width');

  const l = parseDimension(length);
  const w = parseDimension(width);
  const area = l !== null && w !== null ? l * w : null;

  const onContinue = handleSubmit((values) => {
    updateDraft(values);
    router.push('/photo');
  });

  return (
    <QuoteStepScreen
      step={1}
      overline={jobType || 'New quote'}
      title="Measure the space"
      description="Pick the room and pop in its dimensions — we'll size up everything else from here."
      footer={
        <StepFooter
          primaryLabel="Continue"
          primaryDisabled={!formState.isValid}
          onPrimary={onContinue}
        />
      }>
      {/* Job / room type — selectable chips, fetched from Directus. */}
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold">Job type</ThemedText>
        {roomTypesQuery.isLoading ? (
          <ThemedView style={styles.chipLoading}>
            <ActivityIndicator />
            <ThemedText type="small" themeColor="textSecondary">
              Loading room types…
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.chipRow}>
            {roomTypes.map((rt) => {
              // Prefer id equality when we have it; fall back to name (offline).
              const selected = rt.id !== null ? rt.id === jobTypeId : rt.name === jobType;
              return (
                <Pressable
                  key={rt.id ?? rt.name}
                  onPress={() => {
                    // Set both together, validating so the Continue gate updates.
                    setValue('jobTypeId', rt.id, { shouldValidate: true });
                    setValue('jobType', rt.name, { shouldValidate: true });
                  }}>
                  <ThemedView
                    type={selected ? 'backgroundSelected' : 'backgroundElement'}
                    style={styles.chip}>
                    <ThemedText type="small">{rt.name}</ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </ThemedView>
        )}
        {usingFallback && (
          <ThemedText type="small" themeColor="textSecondary">
            Offline — showing a default room list.
          </ThemedText>
        )}
      </ThemedView>

      {/* Unit toggle (ft / m) — a small segmented control. Changing it re-runs
          validation because the allowed dimension ranges are unit-dependent. */}
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold">Units</ThemedText>
        <ThemedView type="backgroundElement" style={styles.toggle}>
          {UNITS.map((u) => {
            const selected = u === unit;
            return (
              <Pressable
                key={u}
                style={styles.toggleItem}
                onPress={() => setValue('unit', u, { shouldValidate: true })}>
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
        <ThemedText type="smallBold">Dimensions ({unit})</ThemedText>
        <Controller
          control={control}
          name="length"
          render={({ field, fieldState }) => (
            <DimensionField
              label="Length"
              value={field.value}
              onChangeText={field.onChange}
              unit={unit}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="width"
          render={({ field, fieldState }) => (
            <DimensionField
              label="Width"
              value={field.value}
              onChangeText={field.onChange}
              unit={unit}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="height"
          render={({ field, fieldState }) => (
            <DimensionField
              label="Height (optional)"
              value={field.value}
              onChangeText={field.onChange}
              unit={unit}
              error={fieldState.error?.message}
            />
          )}
        />
      </ThemedView>

      {/* Live floor-area readout once length and width are valid. */}
      {area !== null && (
        <ThemedView type="backgroundElement" style={styles.areaCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Floor area
          </ThemedText>
          <ThemedText type="subtitle">
            {area.toLocaleString()} {unit}²
          </ThemedText>
        </ThemedView>
      )}
    </QuoteStepScreen>
  );
}

// Single labelled dimension input. Numeric keyboard; the active unit sits in
// the field as a suffix. Shows a validation error beneath the field when set.
function DimensionField({
  label,
  value,
  onChangeText,
  unit,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit: Unit;
  error?: string;
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
      {error && (
        <ThemedText type="small" style={{ color: ErrorColor }}>
          {error}
        </ThemedText>
      )}
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
