import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Divider } from '@/components/divider';
import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { JOB_TYPES, UNITS, type Unit } from '@/constants/quote';
import { Radius, Spacing } from '@/constants/theme';
import { useQuoteDraft } from '@/context/quote-draft';
import { useRoomTypes } from '@/hooks/use-room-types';
import { useTheme } from '@/hooks/use-theme';
import { dimensionsSchema, type DimensionsForm } from '@/lib/quote-schema';

// A room-type chip: server rows carry a Directus id; the offline fallback list
// has names only (id null), which is fine — an offline quote just can't record
// the stable reference.
type RoomTypeChip = { id: number | null; name: string };

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
  const theme = useTheme();

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
      {/* Job / room type — selectable chips, fetched from Directus. Selection
          is an `ink` fill; the accent belongs to the progress bar. */}
      <View style={styles.section}>
        <ThemedText type="label">Job type</ThemedText>
        {roomTypesQuery.isLoading ? (
          <View style={styles.chipLoading}>
            <ActivityIndicator />
            <ThemedText type="caption">Loading room types…</ThemedText>
          </View>
        ) : (
          <View style={styles.chipRow}>
            {roomTypes.map((rt) => {
              // Prefer id equality when we have it; fall back to name (offline).
              const selected = rt.id !== null ? rt.id === jobTypeId : rt.name === jobType;
              return (
                <Pressable
                  key={rt.id ?? rt.name}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    // Set both together, validating so the Continue gate updates.
                    setValue('jobTypeId', rt.id, { shouldValidate: true });
                    setValue('jobType', rt.name, { shouldValidate: true });
                  }}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.ink : theme.surface,
                      borderColor: selected ? theme.ink : theme.hairline,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="body" themeColor={selected ? 'onInk' : 'body'}>
                    {rt.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}
        {usingFallback && (
          <ThemedText type="caption">Offline — showing a default room list.</ThemedText>
        )}
      </View>

      {/* Unit toggle (ft / m). Changing it re-runs validation because the
          allowed dimension ranges are unit-dependent. */}
      <View style={styles.section}>
        <ThemedText type="label">Units</ThemedText>
        <View style={[styles.toggle, { borderColor: theme.hairline }]}>
          {UNITS.map((u, index) => {
            const selected = u === unit;
            return (
              <Pressable
                key={u}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setValue('unit', u, { shouldValidate: true })}
                style={[
                  styles.toggleItem,
                  selected && { backgroundColor: theme.ink },
                  index > 0 && {
                    borderLeftWidth: StyleSheet.hairlineWidth,
                    borderLeftColor: theme.hairline,
                  },
                ]}>
                <ThemedText type="bodyBold" themeColor={selected ? 'onInk' : 'body'}>
                  {u}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Dimensions. Height is optional — only some jobs need it. */}
      <View style={styles.section}>
        <ThemedText type="label">Dimensions ({unit})</ThemedText>
        <View style={styles.fields}>
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
        </View>
      </View>

      {/* Live floor-area readout once length and width are valid. Not a card —
          a hairline and a big number carry it. */}
      {area !== null && (
        <View style={styles.readout}>
          <Divider />
          <View style={styles.readoutBody}>
            <ThemedText type="label">Floor area</ThemedText>
            <ThemedText type="display" tabular>
              {area.toLocaleString()} {unit}²
            </ThemedText>
          </View>
        </View>
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
    <View style={styles.field}>
      <ThemedText type="label">{label}</ThemedText>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.hairline },
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.ink }]}
        />
        <ThemedText type="body" themeColor="muted">
          {unit}
        </ThemedText>
      </View>
      {error && (
        <ThemedText type="caption" themeColor="danger">
          {error}
        </ThemedText>
      )}
    </View>
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
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  toggleItem: {
    minWidth: 64,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fields: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
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
});
