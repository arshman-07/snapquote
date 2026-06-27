import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent, Spacing } from '@/constants/theme';
import { QUOTE_STEPS, QUOTE_STEP_COUNT } from '@/constants/quote';
import { useTheme } from '@/hooks/use-theme';

// Slim progress indicator shown at the top of every quote step. A row of
// segments fills up to the current step, with a "Step N of M · Name" caption
// underneath so the user always knows where they are in the flow.
export function StepProgress({ current }: { current: number }) {
  const theme = useTheme();
  const label = QUOTE_STEPS[current - 1];

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {Array.from({ length: QUOTE_STEP_COUNT }).map((_, i) => {
          const filled = i < current;
          return (
            <View
              key={i}
              style={[
                styles.segment,
                { backgroundColor: filled ? Accent : theme.backgroundSelected },
              ]}
            />
          );
        })}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
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
    height: 4,
    borderRadius: 2,
  },
});
