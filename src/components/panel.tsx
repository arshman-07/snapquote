import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useShadows, useTheme } from '@/hooks/use-theme';

type PanelProps = {
  children: ReactNode;
  /** Lift to the floating level — for the one panel that should dominate. */
  elevated?: boolean;
  /** Corner screw heads. On by default: they're the signature of a panel. */
  screws?: boolean;
  /** Three vent slots in the top-right corner, for "hardware" panels. */
  vents?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A module bolted onto the chassis (elevation +1). Same plastic as the page —
 * it separates by shadow alone, never by a border or a different fill. Screws
 * sit exactly 12pt in from each corner so every panel in the app lines up.
 */
export function Panel({ children, elevated, screws = true, vents, style }: PanelProps) {
  const theme = useTheme();
  const shadows = useShadows();

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: theme.background,
          boxShadow: elevated ? shadows.floating : shadows.card,
        },
        style,
      ]}>
      {screws && (
        <>
          <Screw style={styles.topLeft} />
          <Screw style={styles.topRight} />
          <Screw style={styles.bottomLeft} />
          <Screw style={styles.bottomRight} />
        </>
      )}
      {vents && <Vents />}
      {children}
    </View>
  );
}

/**
 * A countersunk screw head: a dimpled disc with a slot across it. The slots are
 * all turned to the same angle — misaligned screws look careless, not "real".
 */
export function Screw({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const shadows = useShadows();

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.screw, { backgroundColor: theme.recessed, boxShadow: shadows.dimple }, style]}>
      <View style={[styles.slot, { backgroundColor: theme.groove }]} />
    </View>
  );
}

/** Three recessed ventilation slots, top-right, clear of the corner screw. */
export function Vents() {
  const theme = useTheme();
  const shadows = useShadows();

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.vents}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[styles.vent, { backgroundColor: theme.recessed, boxShadow: shadows.dimple }]}
        />
      ))}
    </View>
  );
}

const SCREW = 7;
// Centre of each screw sits 12pt from the two nearest edges.
const SCREW_OFFSET = 12 - SCREW / 2;

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  screw: {
    position: 'absolute',
    width: SCREW,
    height: SCREW,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: {
    width: SCREW - 2,
    height: 1,
    transform: [{ rotate: '45deg' }],
  },
  topLeft: { top: SCREW_OFFSET, left: SCREW_OFFSET },
  topRight: { top: SCREW_OFFSET, right: SCREW_OFFSET },
  bottomLeft: { bottom: SCREW_OFFSET, left: SCREW_OFFSET },
  bottomRight: { bottom: SCREW_OFFSET, right: SCREW_OFFSET },
  vents: {
    position: 'absolute',
    top: Spacing.three,
    right: 28,
    flexDirection: 'row',
    gap: Spacing.one,
  },
  vent: {
    width: 4,
    height: 24,
    borderRadius: Radius.full,
  },
});
