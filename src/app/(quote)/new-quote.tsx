import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Field } from '@/components/field';
import { Panel } from '@/components/panel';
import { QuoteStepScreen } from '@/components/quote-step-screen';
import { Readout, ReadoutText } from '@/components/readout';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { JOB_TYPES, UNITS } from '@/constants/quote';
import { Spacing } from '@/constants/theme';
import { useQuoteDraft } from '@/context/quote-draft';
import { useRoomTypes } from '@/hooks/use-room-types';
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
  const { control, handleSubmit, setValue, formState } = useForm<DimensionsForm>({
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
  // `useWatch` rather than `watch()`: the latter reads react-hook-form's mutable
  // store during render, which makes the React Compiler bail out and skip
  // optimising this whole component. `useWatch` subscribes as a proper hook.
  const [unit, jobType, jobTypeId, length, width] = useWatch({
    control,
    name: ['unit', 'jobType', 'jobTypeId', 'length', 'width'],
  });

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
      {/* Job / room type — latching chips, fetched from Directus. */}
      <View style={styles.section}>
        <ThemedText type="label">Job type</ThemedText>
        {roomTypesQuery.isLoading ? (
          <View style={styles.chipLoading}>
            <ActivityIndicator />
            <ThemedText type="caption">Loading room types…</ThemedText>
          </View>
        ) : (
          <View style={styles.chipRow}>
            {roomTypes.map((rt) => (
              <Chip
                key={rt.id ?? rt.name}
                label={rt.name}
                // Prefer id equality when we have it; fall back to name (offline).
                selected={rt.id !== null ? rt.id === jobTypeId : rt.name === jobType}
                onPress={() => {
                  // Set both together, validating so the Continue gate updates.
                  setValue('jobTypeId', rt.id, { shouldValidate: true });
                  setValue('jobType', rt.name, { shouldValidate: true });
                }}
              />
            ))}
          </View>
        )}
        {usingFallback && (
          <ThemedText type="caption">Offline — showing a default room list.</ThemedText>
        )}
      </View>

      {/* Unit selector (ft / m). Changing it re-runs validation because the
          allowed dimension ranges are unit-dependent. */}
      <View style={styles.section}>
        <ThemedText type="label">Units</ThemedText>
        <View style={styles.chipRow}>
          {UNITS.map((u) => (
            <Chip
              key={u}
              label={u}
              selected={u === unit}
              onPress={() => setValue('unit', u, { shouldValidate: true })}
              style={styles.unitChip}
            />
          ))}
        </View>
      </View>

      {/* Dimensions panel. Height is optional — only some jobs need it. Once
          length and width are valid, the floor area lights up on the panel's
          readout screen. */}
      <Panel style={styles.panel}>
        <ThemedText type="label">Dimensions ({unit})</ThemedText>
        <Controller
          control={control}
          name="length"
          render={({ field, fieldState }) => (
            <Field
              label="Length"
              value={field.value}
              onChangeText={field.onChange}
              keyboardType="decimal-pad"
              placeholder="0"
              suffix={unit}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="width"
          render={({ field, fieldState }) => (
            <Field
              label="Width"
              value={field.value}
              onChangeText={field.onChange}
              keyboardType="decimal-pad"
              placeholder="0"
              suffix={unit}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="height"
          render={({ field, fieldState }) => (
            <Field
              label="Height (optional)"
              value={field.value}
              onChangeText={field.onChange}
              keyboardType="decimal-pad"
              placeholder="0"
              suffix={unit}
              error={fieldState.error?.message}
            />
          )}
        />

        {area !== null && (
          <Readout minHeight={96}>
            <ReadoutText variant="label">Floor area</ReadoutText>
            <ReadoutText variant="figure" numberOfLines={1} adjustsFontSizeToFit>
              {area.toLocaleString()} {unit}²
            </ReadoutText>
          </Readout>
        )}
      </Panel>
    </QuoteStepScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
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
  unitChip: {
    minWidth: 88,
  },
  panel: {
    gap: Spacing.four,
    // Clear the corner screws.
    paddingTop: Spacing.five,
  },
});
