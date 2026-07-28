import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { QUOTE_STEPS, QUOTE_STEP_COUNT } from '@/constants/quote';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Slim progress indicator shown at the top of every quote step. A row of
// segments fills up to the current step, with a "Step N of M · Name" label
// underneath so the user always knows where they are in the flow.
//
// This is one of the three sanctioned uses of the orange accent. Because it
// appears on every step screen, it also means nothing else in the quote flow
// may use the accent — the progress bar has already spent the one-per-screen
// budget.
export function StepProgress({ current }: { current: number }) {
  const theme = useTheme();
  const label = QUOTE_STEPS[current - 1];

  return (
    <View style={styles.container}>
      <View
        style={styles.bar}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: QUOTE_STEP_COUNT, now: current }}>
        {Array.from({ length: QUOTE_STEP_COUNT }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < current ? theme.accent : theme.hairline },
            ]}
          />
        ))}
      </View>
      <ThemedText type="label">
        Step {current} of {QUOTE_STEP_COUNT} · {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  bar: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
  },
});
