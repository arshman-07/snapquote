/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, Shadows, type Scheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * The active scheme. `useColorScheme` is 'light' | 'dark' | null | undefined —
 * null/undefined both mean "not yet known", so anything that isn't explicitly
 * dark falls back to light (the canonical look).
 */
export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

/** Colour tokens for the active scheme. */
export function useTheme() {
  return Colors[useScheme()];
}

/** Neumorphic `boxShadow` strings for the active scheme (see `Shadows`). */
export function useShadows() {
  return Shadows[useScheme()];
}
