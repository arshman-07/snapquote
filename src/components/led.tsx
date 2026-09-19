import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useShadows, useTheme } from '@/hooks/use-theme';

type LedTone = 'accent' | 'success' | 'warning' | 'off';

// A slow breathe for lit LEDs — the Reanimated CSS keyframes equivalent of
// Tailwind's `animate-pulse`.
const breathe = {
  '0%': { opacity: 1 },
  '50%': { opacity: 0.45 },
  '100%': { opacity: 1 },
};

/**
 * A status LED with its stamped mono legend ("ONLINE", "DRAFT"). Lit LEDs bloom
 * in their own colour; `off` is a dark, dimpled lens set into the panel.
 *
 * The label carries the meaning — the colour only reinforces it — so status is
 * never conveyed by colour alone.
 */
export function Led({
  tone = 'accent',
  label,
  pulse,
  size = 8,
}: {
  tone?: LedTone;
  label?: string;
  /** Breathe continuously. Reserve for live states ("working", "online"). */
  pulse?: boolean;
  size?: number;
}) {
  const theme = useTheme();
  const shadows = useShadows();
  const lit = tone !== 'off';
  const color = lit ? theme[tone] : theme.recessed;

  const lens = (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Radius.full,
          backgroundColor: color,
          // Bloom in the LED's own colour (8-digit hex = ~60% alpha).
          boxShadow: lit ? `0px 0px ${size + 2}px 1px ${color}99` : shadows.dimple,
        },
        pulse &&
          lit && {
            animationName: breathe,
            animationDuration: 2000,
            animationIterationCount: 'infinite',
          },
      ]}
    />
  );

  if (!label) return lens;

  return (
    <View style={styles.row}>
      {lens}
      <ThemedText type="label">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
