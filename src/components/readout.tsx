import { type ReactNode } from 'react';
import { StyleSheet, Text, View, type TextProps } from 'react-native';

import { fontFor, Radius, ScreenColors, Spacing } from '@/constants/theme';
import { useShadows, useTheme } from '@/hooks/use-theme';

// Enough 4pt scanlines to cover any readout we build; the glass clips the rest.
const SCANLINES = Array.from({ length: 60 }, (_, i) => i);

/**
 * A backlit display set into the panel — the "device screen" of the design.
 * A recessed bezel (level -1) holds dark glass with CRT scanlines over it;
 * content goes on the glass, typically `ReadoutText`.
 *
 * Only for figures worth putting on a screen (a latest total, a floor area) —
 * one per screen at most, or it stops feeling special.
 */
export function Readout({ children, minHeight = 112 }: { children: ReactNode; minHeight?: number }) {
  const theme = useTheme();
  const shadows = useShadows();

  return (
    <View style={[styles.bezel, { backgroundColor: theme.recessed, boxShadow: shadows.recessed }]}>
      <View style={[styles.glass, { minHeight }]}>
        <View style={styles.content}>{children}</View>
        {/* Scanlines sit above the content, like the phosphor mask on a tube.
            Purely decorative, and they must never swallow touches. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
          {SCANLINES.map((i) => (
            <View key={i} style={[styles.scanline, { top: i * 4 + 2 }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Text on the readout glass: mono, backlit. `figure` is the big glowing number,
 * `label` the small uppercase legend, `text` a line of secondary detail.
 */
export function ReadoutText({
  variant = 'text',
  style,
  ...rest
}: TextProps & { variant?: 'figure' | 'label' | 'text' }) {
  return <Text style={[styles.base, styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  bezel: {
    borderRadius: Radius.lg,
    padding: Spacing.two,
  },
  glass: {
    borderRadius: Radius.md,
    backgroundColor: ScreenColors.glass,
    overflow: 'hidden',
    boxShadow: 'inset 0px 2px 8px rgba(0,0,0,0.7)',
  },
  content: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.one,
    justifyContent: 'center',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: ScreenColors.scanline,
  },
  base: {
    color: ScreenColors.text,
    fontFamily: fontFor('mono', 500),
  },
  figure: {
    fontFamily: fontFor('mono', 700),
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
    textShadowColor: ScreenColors.bloom,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  label: {
    color: ScreenColors.dim,
    fontFamily: fontFor('mono', 700),
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  text: {
    color: ScreenColors.dim,
    fontSize: 13,
    lineHeight: 18,
  },
});
