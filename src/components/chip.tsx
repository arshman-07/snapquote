import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Key } from '@/components/button';
import { Led } from '@/components/led';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

/**
 * One option in a pick-one group (room type, units, labour rate, account type).
 * A latching key with an indicator LED: the chosen one stays pressed into the
 * panel and its lamp lights, like a radio selector on a piece of equipment.
 *
 * Every chip carries a lens, lit or not, so selecting one never changes its
 * width — and selection is also exposed as `accessibilityState.selected`, so
 * it is never conveyed by colour alone.
 */
export function Chip({
  label,
  selected,
  onPress,
  tabular,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Figures in the legend (prices) — set in mono. */
  tabular?: boolean;
  /** Outer layout, e.g. `{ flex: 1 }` to make a full-width segment. */
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Key
      onPress={onPress}
      latched={selected}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={style}
      faceStyle={styles.face}>
      <Led tone={selected ? 'accent' : 'off'} size={7} />
      <ThemedText type="bodyBold" themeColor={selected ? 'ink' : 'body'} tabular={tabular}>
        {label}
      </ThemedText>
    </Key>
  );
}

const styles = StyleSheet.create({
  face: {
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
});
