/**
 * Design tokens for the whole app.
 *
 * Direction: Industrial Skeuomorphism. The UI is a physical device: a matte
 * plastic chassis (the page) with panels bolted onto it, keys that depress,
 * data slots recessed into the surface, and LEDs for status. Depth comes from
 * paired shadows lit from the TOP-LEFT — highlight on the top/left edge, shadow
 * on the bottom/right. Never break that light direction.
 *
 * Typography is Inter for reading and JetBrains Mono for anything numeric or
 * stamped (labels, prices, inputs). Every token has a light AND a dark stop —
 * light is the canonical workshop-grey look; dark is a charcoal control panel
 * lit by the same rules.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** Chassis — the base plastic every screen is mounted on (level 0). */
    background: '#E0E5EC',
    /** Recessed wells — inputs, screens, grooves (level -1). */
    recessed: '#D1D9E6',
    /** Primary text: charcoal ink, softer than pure black. */
    ink: '#2D3436',
    /** Secondary text — supporting copy that is still meant to be read. */
    body: '#4A5568',
    /** Labels, hints, placeholders. Still AA (≈4.9:1) on the chassis. */
    muted: '#566173',
    /** Dividers and outlines where a groove would be too heavy. */
    hairline: '#BABECC',
    /** The shadowed (upper) lip of a machined groove. */
    groove: '#BABECC',
    /** The lit (lower) lip of a groove — the highlight half of the light pair. */
    highlight: '#FFFFFF',
    /**
     * Safety orange / Braun red. The "emergency stop" of the palette: primary
     * keys, active LEDs, the progress pipe, selection. Nothing decorative.
     */
    accent: '#FF4757',
    /** Text/icons on an `accent` fill. */
    onAccent: '#FFFFFF',
    /**
     * Validation and failure text. Deliberately a deeper, browner red than the
     * accent so an error never reads as "this is the button to press".
     */
    danger: '#B0302A',
    /** "Online / OK" LED. */
    success: '#22C55E',
    /** "Attention / draft" LED. */
    warning: '#F59E0B',
  },
  dark: {
    // Charcoal chassis. Neumorphism needs a mid-tone to have room for both a
    // highlight and a shadow, so this is slate, not black.
    background: '#2B3036',
    recessed: '#23272C',
    ink: '#E0E5EC',
    body: '#A8B2D1',
    muted: '#939DB0',
    hairline: '#3D444D',
    groove: '#1D2125',
    highlight: '#3A4048',
    // Same accent in both modes — it's the brand, and it holds on charcoal.
    accent: '#FF4757',
    onAccent: '#FFFFFF',
    danger: '#FF7A70',
    success: '#22C55E',
    warning: '#F59E0B',
  },
} as const;

/**
 * The built-in "screen" (see `Readout`). A backlit display looks the same in
 * both modes — it emits light rather than reflecting the room — so it has one
 * set of colours, not a light/dark pair.
 */
export const ScreenColors = {
  glass: '#1C2024',
  text: '#E8ECF1',
  /** Secondary readout text. ≈6:1 on the glass. */
  dim: '#8A94A6',
  scanline: 'rgba(0,0,0,0.22)',
  /** Soft phosphor bloom behind lit figures. */
  bloom: 'rgba(232,236,241,0.35)',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Scheme = keyof typeof Colors;

/**
 * The neumorphic shadow system — the core visual signature. Each value is a
 * CSS-style `boxShadow` string (supported natively by React Native's New
 * Architecture), so they layer and can be inset.
 *
 * Elevation hierarchy:
 *   recessed  (-1)  inputs, screens, grooves        — inset pair
 *   pressed   (-1)  a key while held down           — deeper inset pair
 *   card      (+1)  panels bolted to the chassis    — outer pair
 *   floating  (+2)  keys, icon housings, the dialog — bigger pair + rim light
 *
 * An element with an outer shadow must have an opaque background (normally the
 * chassis colour), or the shadow shows through it.
 */
export const Shadows = {
  light: {
    card: '8px 8px 16px #BABECC, -8px -8px 16px #FFFFFF',
    floating:
      '12px 12px 24px #BABECC, -12px -12px 24px #FFFFFF, inset 1px 1px 0px rgba(255,255,255,0.5)',
    pressed: 'inset 6px 6px 12px #BABECC, inset -6px -6px 12px #FFFFFF',
    recessed: 'inset 4px 4px 8px #BABECC, inset -4px -4px 8px #FFFFFF',
    // Small outer pair for compact controls (chips, stepper keys) where the
    // card-sized blur would swamp the element.
    key: '4px 4px 8px #BABECC, -4px -4px 8px #FFFFFF',
    // Red-tinted pair for the accent key, so it glows rather than greys.
    accentKey: '4px 4px 8px rgba(166,50,60,0.4), -4px -4px 8px rgba(255,100,110,0.4)',
    accentPressed: 'inset 4px 4px 8px rgba(166,50,60,0.5), inset -4px -4px 8px rgba(255,120,130,0.4)',
    /** Screw heads and vent slots — tiny inset dimples. */
    dimple: 'inset 1px 1px 2px rgba(0,0,0,0.25), inset -1px -1px 1px rgba(255,255,255,0.8)',
  },
  dark: {
    card: '8px 8px 16px #1D2125, -8px -8px 16px #393F47',
    floating:
      '12px 12px 24px #1D2125, -12px -12px 24px #393F47, inset 1px 1px 0px rgba(255,255,255,0.06)',
    pressed: 'inset 6px 6px 12px #1D2125, inset -6px -6px 12px #393F47',
    recessed: 'inset 4px 4px 8px #1A1D21, inset -4px -4px 8px #363C44',
    key: '4px 4px 8px #1D2125, -4px -4px 8px #393F47',
    accentKey: '4px 4px 8px rgba(0,0,0,0.45), -3px -3px 6px rgba(255,100,110,0.18)',
    accentPressed: 'inset 4px 4px 8px rgba(120,20,30,0.6), inset -4px -4px 8px rgba(255,120,130,0.3)',
    dimple: 'inset 1px 1px 2px rgba(0,0,0,0.6), inset -1px -1px 1px rgba(255,255,255,0.08)',
  },
} as const;

/**
 * Font family names as registered by `useFonts` in the root layout. With custom
 * fonts every weight is its own family, so `fontWeight` must never be set
 * alongside these — ThemedText maps weight → family instead (see `fontFor`).
 */
export const FontFamilies = {
  sans: {
    '400': 'Inter_400Regular',
    '600': 'Inter_600SemiBold',
    '700': 'Inter_700Bold',
    '800': 'Inter_800ExtraBold',
  },
  mono: {
    '500': 'JetBrainsMono_500Medium',
    '700': 'JetBrainsMono_700Bold',
  },
} as const;

export type FontKind = keyof typeof FontFamilies;

/**
 * Resolve a family + weight to the loaded font file, snapping to the nearest
 * weight we ship. Keeps call sites thinking in weights, like normal CSS.
 */
export function fontFor(kind: FontKind, weight: string | number = 400): string {
  const w = Number(weight === 'bold' ? 700 : weight === 'normal' ? 400 : weight) || 400;
  if (kind === 'mono') return w >= 600 ? FontFamilies.mono['700'] : FontFamilies.mono['500'];
  if (w >= 800) return FontFamilies.sans['800'];
  if (w >= 700) return FontFamilies.sans['700'];
  if (w >= 500) return FontFamilies.sans['600'];
  return FontFamilies.sans['400'];
}

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Corner radius — soft, injection-moulded curves rather than machined edges. */
export const Radius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/**
 * Motion. Mechanical spring physics: a slight overshoot, like a sprung switch.
 * `press` is deliberately fast so a key feels like it clicks, not slides.
 */
export const Motion = {
  /** cubic-bezier control points for the mechanical ease. */
  springCurve: [0.175, 0.885, 0.32, 1.275] as const,
  press: 150,
  smooth: 300,
  /** How far a key travels when pressed. */
  keyTravel: 2,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
