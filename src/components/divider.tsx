import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * A machined groove cut across the panel: a shadowed upper lip over a lit lower
 * lip, so it reads as a channel in the plastic rather than a painted line. Same
 * top-left light as everything else — the shadow is on top because the light
 * can't reach into the cut from above.
 *
 * Prefer whitespace and alignment for grouping; reach for this only where
 * separation is genuinely needed (e.g. between rows in a list).
 */
export function Divider({ inset = 0 }: { inset?: number }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.groove,
        { borderTopColor: theme.groove, borderBottomColor: theme.highlight, marginLeft: inset },
      ]}
      // Purely decorative — keep it out of the accessibility tree.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  groove: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
});
