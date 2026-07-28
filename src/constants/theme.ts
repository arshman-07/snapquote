/**
 * Design tokens for the whole app.
 *
 * Direction: native-iOS feel, not a custom visual identity. No custom typeface
 * (we use the system font — San Francisco on iOS — by simply never setting
 * `fontFamily`), no UI kit, no gradients, no drop shadows, no emoji.
 *
 * The palette is stone neutrals with near-black actions. Every token defines
 * both a light and a dark stop up front so dark mode never needs retrofitting.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** Page background — a warm off-white, never pure #fff. */
    background: '#FAFAF9',
    /** Raised/inset surfaces that must separate from the page. Use sparingly. */
    surface: '#FFFFFF',
    /** Primary text, and the fill of primary buttons. */
    ink: '#1C1917',
    /** Secondary text — supporting copy that is still meant to be read. */
    body: '#57534E',
    /** Labels, hints, timestamps — present but not competing. */
    muted: '#A8A29E',
    /** Dividers. Always paired with StyleSheet.hairlineWidth, never 1px. */
    hairline: '#E7E5E4',
    /** Burnt orange. Reserved — see the accent discipline note below. */
    accent: '#EA580C',
    /** Text/icons sitting on top of an `ink` fill. */
    onInk: '#FAFAF9',
    /**
     * Validation and failure states only. Not part of the decorative palette
     * and not subject to the one-accent-per-screen rule — an error must be
     * able to appear anywhere, including next to the progress bar.
     */
    danger: '#B91C1C',
  },
  dark: {
    background: '#0C0A09',
    surface: '#1C1917',
    // `ink` stays semantic rather than literal: it is the primary-emphasis
    // colour, so on dark it becomes near-white — and primary buttons invert
    // with it automatically.
    ink: '#FAFAF9',
    body: '#A8A29E',
    muted: '#78716C',
    hairline: '#292524',
    // One stop lighter than the light-mode accent so it holds up on near-black.
    accent: '#F97316',
    onInk: '#1C1917',
    danger: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Accent discipline — the rule that keeps this from looking templated:
 * orange is NOT a primary-action colour. Primary actions are `ink` fills with
 * `onInk` text. The accent is reserved for the step-progress bar, the selected
 * material tier, and status badges — and at most ONE accent element should be
 * visible on a screen at a time.
 */

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * Corner radius. Controls and buttons are 8; only genuinely sheet-like or
 * tile-like surfaces get 12. Nothing is rounded more than that — uniformly
 * large radii are what make an app read as a template.
 */
export const Radius = {
  control: 8,
  sheet: 12,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
