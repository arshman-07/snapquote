/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  // `useColorScheme` is 'light' | 'dark' | null | undefined — null/undefined
  // both mean "not yet known", so anything that isn't explicitly dark falls
  // back to light rather than indexing Colors with a nullish key.
  const scheme = useColorScheme();

  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
