import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * A single hairline rule. Always `StyleSheet.hairlineWidth` — a literal 1px
 * reads as a heavy border on a retina screen and is the fastest way to make a
 * list look like a web table.
 *
 * Prefer whitespace and alignment for grouping; reach for this only where
 * separation is genuinely needed (e.g. between rows in a list).
 */
export function Divider({ inset = 0 }: { inset?: number }) {
  const theme = useTheme();

  return (
    <View
      style={[styles.rule, { backgroundColor: theme.hairline, marginLeft: inset }]}
      // Purely decorative — keep it out of the accessibility tree.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  rule: {
    height: StyleSheet.hairlineWidth,
  },
});
