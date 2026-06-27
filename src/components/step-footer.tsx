import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';

type StepFooterProps = {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  // When provided, a "Back" affordance is shown to the left of the primary
  // button. Omitted on the first step (the flow is dismissed by swiping down).
  onBack?: () => void;
};

// Shared bottom action row for the quote wizard. Keeps the primary call to
// action looking identical on every step, with an optional Back button.
export function StepFooter({ primaryLabel, onPrimary, primaryDisabled, onBack }: StepFooterProps) {
  return (
    <View style={styles.row}>
      {onBack && (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backWrapper, pressed && styles.pressed]}>
          <ThemedView type="backgroundElement" style={styles.back}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Back
            </ThemedText>
          </ThemedView>
        </Pressable>
      )}

      <Pressable
        onPress={onPrimary}
        disabled={primaryDisabled}
        style={({ pressed }) => [styles.primaryWrapper, pressed && styles.pressed]}>
        {primaryDisabled ? (
          // Disabled state stays neutral so it reads as "not yet" rather than active.
          <ThemedView type="backgroundElement" style={[styles.primary, styles.disabled]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {primaryLabel}
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={[styles.primary, { backgroundColor: Accent }]}>
            <ThemedText type="smallBold" style={styles.primaryLabel}>
              {primaryLabel}
            </ThemedText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  backWrapper: {
    flexShrink: 0,
  },
  back: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  primaryWrapper: {
    flex: 1,
  },
  primary: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#ffffff',
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.7,
  },
});
