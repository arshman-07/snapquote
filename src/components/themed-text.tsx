import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The type scale is deliberately sparse. Six stops with distinct jobs beats a
 * stack of 17/15/14/13 that all read the same — hierarchy here comes from big
 * jumps in size and weight, not from nudging a few points.
 *
 * display  34  hero numbers only (a grand total, a headline figure)
 * title    28  screen titles
 * heading  20  section headings that need real presence
 * body     17  reading copy (iOS body size)
 * caption  13  hints, inline errors, secondary detail
 * label    11  uppercase micro-labels: section headers, metadata, timestamps
 */
export type TextType =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'label'
  | 'link'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
  /**
   * Tabular figures. Required on every monetary value so digits occupy equal
   * width and totals line up in a column.
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
  link: 'ink',
  code: 'body',
};

export function ThemedText({
  style,
  type = 'body',
  themeColor,
  tabular,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? defaultColor[type]] },
        styles[type],
        tabular && styles.tabular,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyBold: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    // ~0.08em at 11px.
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  link: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
