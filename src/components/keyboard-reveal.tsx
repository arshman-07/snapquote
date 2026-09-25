import { createContext, useContext } from 'react';
import { type View } from 'react-native';

/**
 * "Scroll this field into view." A scrolling screen that hosts inputs provides
 * this (see `QuoteStepScreen`); `DataInput` calls it with its own well when it
 * gains focus, so the field slides up clear of the keyboard.
 *
 * Screens that don't provide it get `null` and inputs simply don't scroll —
 * the auth screens and the rename dialog rely on KeyboardAvoidingView instead.
 */
export const KeyboardRevealContext = createContext<((node: View | null) => void) | null>(null);

export function useKeyboardReveal() {
  return useContext(KeyboardRevealContext);
}
