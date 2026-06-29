import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
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
        // Added state — a placeholder thumbnail (no real image yet) plus a way
        // to remove it. Phase 3 swaps the tile for the actual captured photo.
        <ThemedView style={styles.section}>
          <ThemedView type="backgroundElement" style={styles.thumb}>
            <ThemedText style={styles.thumbGlyph}>✓</ThemedText>
            <ThemedText type="smallBold">Photo added</ThemedText>
          </ThemedView>
          <Pressable
            onPress={() => updateDraft({ photoAdded: false })}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="smallBold" style={[styles.removeLabel, { color: Accent }]}>
              Remove photo
            </ThemedText>
          </Pressable>
        </ThemedView>
      ) : (
        // Empty state — a tappable dropzone and the two capture entry points.
        <ThemedView style={styles.section}>
          <Dropzone onPress={() => updateDraft({ photoAdded: true })} />
          <View style={styles.actions}>
            <CaptureButton label="Take photo" onPress={() => updateDraft({ photoAdded: true })} />
            <CaptureButton
              label="Choose from library"
              onPress={() => updateDraft({ photoAdded: true })}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Optional — a quick snap helps the AI sanity-check the estimate. You can skip this.
          </ThemedText>
        </ThemedView>
      )}
    </QuoteStepScreen>
  );
}

// Large dashed-border target standing in for the eventual camera/library entry.
function Dropzone({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type="backgroundElement"
        style={[styles.dropzone, { borderColor: theme.backgroundSelected }]}>
        <ThemedText style={styles.dropzoneGlyph}>📷</ThemedText>
        <ThemedText type="smallBold">Add a photo of the space</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Tap to add
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

// One of the two capture actions. Neutral (non-accent) so neither dominates,
// matching the rest of the flow's secondary controls.
function CaptureButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionWrapper, pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={styles.action}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
      </ThemedView>
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
    borderRadius: Spacing.four,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dropzoneGlyph: {
    fontSize: 40,
    marginBottom: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionWrapper: {
    flex: 1,
  },
  action: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  hint: {
    textAlign: 'center',
  },
  thumb: {
    paddingVertical: Spacing.six,
    borderRadius: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  thumbGlyph: {
    fontSize: 36,
    color: Accent,
  },
  removeLabel: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
