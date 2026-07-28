import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SecondaryButton, TextButton } from '@/components/button';
import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useQuoteDraft } from '@/context/quote-draft';
import { useTheme } from '@/hooks/use-theme';

// Step 2 — Photo capture. Optional. In Phase 1 there's no real camera/library
// access (that arrives in Phase 3 with expo-image-picker), so "Take photo" and
// "Choose from library" just record that a photo was added on the draft. The
// layout telegraphs the eventual capture UX so it won't change when wired up.
export default function PhotoScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useQuoteDraft();

  return (
    <QuoteStepScreen
      step={2}
      overline={draft.jobType ?? 'New quote'}
      title="Add a photo"
      description="A quick snap of the space helps us sanity-check the estimate."
      footer={
        <StepFooter
          primaryLabel="Continue"
          onPrimary={() => router.push('/materials')}
          onBack={() => router.back()}
        />
      }>
      {draft.photoAdded ? (
        // Added state — a placeholder tile (no real image yet) plus a way to
        // remove it. Phase 3 swaps the tile for the actual captured photo.
        <View style={styles.section}>
          <PhotoTile />
          <TextButton label="Remove photo" onPress={() => updateDraft({ photoAdded: false })} />
        </View>
      ) : (
        // Empty state — a tappable dropzone and the two capture entry points.
        <View style={styles.section}>
          <Dropzone onPress={() => updateDraft({ photoAdded: true })} />
          <View style={styles.actions}>
            <SecondaryButton
              label="Take photo"
              onPress={() => updateDraft({ photoAdded: true })}
              style={styles.action}
            />
            <SecondaryButton
              label="Choose from library"
              onPress={() => updateDraft({ photoAdded: true })}
              style={styles.action}
            />
          </View>
          <ThemedText type="caption" style={styles.hint}>
            Optional — you can skip this and add one later.
          </ThemedText>
        </View>
      )}
    </QuoteStepScreen>
  );
}

// Stand-in for the eventual captured image. Hierarchy comes from type, not from
// an icon — there is no icon set in the app and emoji are off the table.
function PhotoTile() {
  const theme = useTheme();

  return (
    <View style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
      <ThemedText type="heading">Photo added</ThemedText>
      <ThemedText type="label">Placeholder — no image captured yet</ThemedText>
    </View>
  );
}

// Large dashed target standing in for the camera/library entry. The dashed rule
// is intentionally 1px rather than hairline: it's a boundary, not a divider,
// and a dash pattern doesn't resolve at sub-pixel widths.
function Dropzone({ onPress }: { onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.dropzone,
        { borderColor: theme.hairline },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="heading">Add a photo of the space</ThemedText>
      <ThemedText type="label">Tap to add</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  dropzone: {
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.sheet,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tile: {
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
  hint: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
