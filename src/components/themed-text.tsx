import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fontFor, type FontKind, ThemeColor } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';

/**
 * The type scale. Inter carries reading text; JetBrains Mono carries anything
 * that is data or a stamped label. Hierarchy comes from big jumps in size and
 * weight, not from nudging a few points.
 *
 * display  34  hero numbers only (a grand total, a headline figure)
 * title    28  screen titles — heavy, tight, embossed
 * heading  20  section headings that need real presence
 * body     17  reading copy
 * caption  13  hints, inline errors, secondary detail
 * label    11  mono, uppercase, wide-tracked — the "printed label" stamp
 * button   15  uppercase key legends
 */
export type TextType =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'label'
  | 'button'
  | 'link'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
  /**
   * Numeric data. Switches the text to JetBrains Mono, so digits are equal
   * width and totals line up in a column. Required on every monetary value.
   */
  tabular?: boolean;
};

// Each stop carries a sensible default colour so the palette is applied
// consistently without every call site restating it. `themeColor` overrides.
const defaultColor: Record<TextType, ThemeColor> = {
  display: 'ink',
  title: 'ink',
  heading: 'ink',
  body: 'ink',
  bodyBold: 'ink',
  caption: 'body',
  label: 'muted',
  button: 'ink',
  link: 'ink',
  code: 'body',
};

// Which face and weight each stop is set in. `tabular` overrides the face.
const face: Record<TextType, { kind: FontKind; weight: number }> = {
  display: { kind: 'sans', weight: 800 },
  title: { kind: 'sans', weight: 800 },
  heading: { kind: 'sans', weight: 700 },
  body: { kind: 'sans', weight: 400 },
  bodyBold: { kind: 'sans', weight: 600 },
  caption: { kind: 'sans', weight: 400 },
  label: { kind: 'mono', weight: 700 },
  button: { kind: 'sans', weight: 700 },
  link: { kind: 'sans', weight: 600 },
  code: { kind: 'mono', weight: 500 },
};

// Big headings are embossed: a 1px highlight below the glyphs on the light
// chassis (as if pressed into the plastic), a dark drop on the charcoal one.
const embossed = new Set<TextType>(['display', 'title', 'heading']);

export function ThemedText({
  style,
  type = 'body',
  themeColor,
  tabular,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const scheme = useScheme();

  // Custom fonts register one family per weight, so a `fontWeight` passed in by
  // a caller (e.g. a bolded link) is translated into the matching family rather
  // than applied — setting both makes Android synthesise a faux bold.
  const flat: TextStyle = StyleSheet.flatten(style) ?? {};
  const { kind, weight } = face[type];
  const fontFamily =
    flat.fontFamily ?? fontFor(tabular ? 'mono' : kind, flat.fontWeight ?? weight);

  return (
    <Text
      style={[
        { color: theme[themeColor ?? defaultColor[type]] },
        styles[type],
        embossed.has(type) && (scheme === 'dark' ? styles.embossDark : styles.embossLight),
        style,
        { fontFamily, fontWeight: undefined },
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    // ≈ -0.03em — tight, like a moulded nameplate.
    letterSpacing: -0.8,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
  },
  bodyBold: {
    fontSize: 17,
    lineHeight: 26,
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    fontSize: 11,
    lineHeight: 15,
    // ≈ 0.08em at 11px.
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  link: {
    fontSize: 17,
    lineHeight: 26,
  },
  code: {
    fontSize: 13,
    lineHeight: 18,
  },
  embossLight: {
    textShadowColor: '#FFFFFF',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  embossDark: {
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
