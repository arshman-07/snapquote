import { useRouter } from 'expo-router';
import { Camera, ImageIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Key, SecondaryButton, TextButton } from '@/components/button';
import { Led } from '@/components/led';
import { QuoteStepScreen } from '@/components/quote-step-screen';
import { Readout, ReadoutText } from '@/components/readout';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { Radius, ScreenColors, Spacing } from '@/constants/theme';
import { useQuoteDraft } from '@/context/quote-draft';
import { useTheme } from '@/hooks/use-theme';

// Step 2 — Photo capture. Optional. In Phase 1 there's no real camera/library
// access (that arrives in Phase 3 with expo-image-picker), so "Take photo" and
// "Library" (shortened from "Choose from library" — uppercase key legends
// wrapped at half width) just record that a photo was added on the draft. The
// layout telegraphs the eventual capture UX so it won't change when wired up:
// the screen is a camera viewfinder, which later shows the real image.
export default function PhotoScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useQuoteDraft();
  const theme = useTheme();

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
        // Added state — the viewfinder reports a captured frame (no real image
        // yet) plus a way to remove it. Phase 3 shows the actual photo here.
        <View style={styles.section}>
          <Readout minHeight={200}>
            <View style={styles.centre}>
              <Led tone="success" size={10} />
              <ReadoutText variant="label">Photo added</ReadoutText>
              <ReadoutText>Placeholder — no image captured yet</ReadoutText>
            </View>
          </Readout>
          <TextButton label="Remove photo" onPress={() => updateDraft({ photoAdded: false })} />
        </View>
      ) : (
        // Empty state — the whole viewfinder is a key (it sinks when pressed),
        // plus the two explicit capture entry points below it.
        <View style={styles.section}>
          <Key
            variant="ghost"
            onPress={() => updateDraft({ photoAdded: true })}
            accessibilityLabel="Add a photo of the space"
            faceStyle={styles.viewfinderKey}>
            <Readout minHeight={200}>
              <View style={styles.centre}>
                <Camera size={32} strokeWidth={1.5} color={ScreenColors.text} />
                <ReadoutText variant="label">No photo · tap to add</ReadoutText>
              </View>
            </Readout>
          </Key>
          <View style={styles.actions}>
            <SecondaryButton
              label="Take photo"
              onPress={() => updateDraft({ photoAdded: true })}
              style={styles.action}
            />
            <SecondaryButton
              label="Library"
              onPress={() => updateDraft({ photoAdded: true })}
              style={styles.action}
            />
          </View>
          <View style={styles.hintRow}>
            <ImageIcon size={16} strokeWidth={1.5} color={theme.muted} />
            <ThemedText type="caption">Optional — you can skip this and add one later.</ThemedText>
          </View>
        </View>
      )}
    </QuoteStepScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.four,
  },
  viewfinderKey: {
    alignItems: 'stretch',
    borderRadius: Radius.lg,
  },
  centre: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  action: {
    flex: 1,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
