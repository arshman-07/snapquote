import { StyleSheet, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { Led } from '@/components/led';
import { ThemedText } from '@/components/themed-text';
import { QUOTE_STEPS, QUOTE_STEP_COUNT } from '@/constants/quote';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useShadows, useTheme } from '@/hooks/use-theme';

const NODE = 14;

// Progress through the quote wizard, drawn as a physical pipe: a recessed
// channel running between five nodes, filled with accent up to the current
// step. Completed nodes are lit, the current one breathes, later ones are dark
// lenses. A stamped "Step N of M · Name" legend sits beneath so the position is
// always stated in words, not just in light.
export function StepProgress({ current }: { current: number }) {
  const theme = useTheme();
  const shadows = useShadows();
  const label = QUOTE_STEPS[current - 1];
  const fill = `${((current - 1) / (QUOTE_STEP_COUNT - 1)) * 100}%` as const;

  return (
    <View style={styles.container}>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${current} of ${QUOTE_STEP_COUNT}, ${label}`}
        accessibilityValue={{ min: 1, max: QUOTE_STEP_COUNT, now: current }}>
        {/* The pipe, inset from the ends so it runs node-centre to node-centre. */}
        <View
          style={[styles.pipe, { backgroundColor: theme.recessed, boxShadow: shadows.recessed }]}>
          <Animated.View
            style={[
              styles.fill,
              {
                width: fill,
                backgroundColor: theme.accent,
                transitionProperty: 'width',
                transitionDuration: Motion.smooth,
                transitionTimingFunction: cubicBezier(...Motion.springCurve),
              },
            ]}
          />
        </View>

        {/* Nodes: sockets in the panel with an LED in each. */}
        <View style={styles.nodes}>
          {QUOTE_STEPS.map((step, i) => {
            const n = i + 1;
            return (
              <View
                key={step}
                style={[
                  styles.node,
                  { backgroundColor: theme.background, boxShadow: shadows.key },
                ]}>
                <Led tone={n <= current ? 'accent' : 'off'} pulse={n === current} size={6} />
              </View>
            );
          })}
        </View>
      </View>

      <ThemedText type="label">
        Step {current} of {QUOTE_STEP_COUNT} · {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  track: {
    height: NODE,
    justifyContent: 'center',
  },
  pipe: {
    position: 'absolute',
    left: NODE / 2,
    right: NODE / 2,
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  nodes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
