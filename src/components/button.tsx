import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useShadows, useTheme } from '@/hooks/use-theme';
import { keyClick } from '@/lib/haptics';

const mechanical = cubicBezier(...Motion.springCurve);

type KeyProps = {
  onPress: () => void;
  children: ReactNode;
  /**
   * chassis — a grey key moulded from the same plastic as the page
   * accent   — the safety-orange key; the one thing on screen to press
   * ghost    — no key at all until touched, then it sinks into a well
   */
  variant?: 'chassis' | 'accent' | 'ghost';
  /**
   * Held down. For toggles, chips and segments: a latched key stays pressed
   * into the panel, the way a physical radio button does.
   */
  latched?: boolean;
  disabled?: boolean;
  /** Layout for the outer touch target (flex, margins, width). */
  style?: StyleProp<ViewStyle>;
  /** Shape of the key face itself (height, padding, radius). */
  faceStyle?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean; busy?: boolean };
  hitSlop?: number;
};

/**
 * A physical key. The building block for every pressable control.
 *
 * Pressing obeys the physics: the face travels down `Motion.keyTravel` and its
 * shadow flips from raised to inset, over a fast sprung curve, with a haptic
 * click. Both properties are driven by Reanimated CSS transitions, so the key
 * just declares its up/down look and Reanimated animates between them.
 */
export function Key({
  onPress,
  children,
  variant = 'chassis',
  latched = false,
  disabled,
  style,
  faceStyle,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
  hitSlop,
}: KeyProps) {
  const theme = useTheme();
  const shadows = useShadows();
  const [held, setHeld] = useState(false);
  const down = (held && !disabled) || latched;

  // Per-variant look in the up and down positions.
  const face: ViewStyle =
    variant === 'accent'
      ? {
          backgroundColor: theme.accent,
          borderColor: 'rgba(255,255,255,0.2)',
          borderWidth: 1,
          boxShadow: down ? shadows.accentPressed : shadows.accentKey,
        }
      : variant === 'ghost'
        ? {
            backgroundColor: down ? theme.recessed : 'transparent',
            boxShadow: down ? shadows.recessed : 'none',
          }
        : {
            backgroundColor: theme.background,
            boxShadow: down ? shadows.pressed : shadows.key,
          };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        setHeld(true);
        keyClick();
      }}
      onPressOut={() => setHeld(false)}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      style={style}>
      <Animated.View
        style={[
          styles.face,
          face,
          {
            transform: [{ translateY: down ? Motion.keyTravel : 0 }],
            transitionProperty: ['transform', 'boxShadow', 'backgroundColor'],
            transitionDuration: Motion.press,
            transitionTimingFunction: mechanical,
          },
          disabled && styles.inactive,
          faceStyle,
        ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

/**
 * The primary action — the safety-orange key. There should be exactly one of
 * these visible at a time: it is the screen's "press here".
 */
export function PrimaryButton({ label, onPress, disabled, loading, style }: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;

  return (
    <Key
      variant="accent"
      onPress={onPress}
      disabled={inactive}
      accessibilityState={{ busy: !!loading }}
      style={style}
      faceStyle={styles.button}>
      {loading ? (
        <ActivityIndicator color={theme.onAccent} />
      ) : (
        <ThemedText type="button" themeColor="onAccent">
          {label}
        </ThemedText>
      )}
    </Key>
  );
}

/** Lower-emphasis action — a grey chassis key. Pairs with PrimaryButton. */
export function SecondaryButton({ label, onPress, disabled, style }: ButtonProps) {
  return (
    <Key onPress={onPress} disabled={disabled} style={style} faceStyle={styles.button}>
      <ThemedText type="button">{label}</ThemedText>
    </Key>
  );
}

/**
 * A tertiary action (skip, cancel, "use a different account"). A flat printed
 * legend with no key under it until touched — it should recede.
 *
 * `tone="danger"` colours it with the `danger` stop for destructive actions.
 * Destructive still means flat, not a red key: a filled red button competes
 * with the primary action and invites the mis-tap it warns about.
 */
export function TextButton({
  label,
  onPress,
  disabled,
  style,
  tone = 'default',
}: ButtonProps & { tone?: 'default' | 'danger' }) {
  return (
    <Key
      variant="ghost"
      onPress={onPress}
      disabled={disabled}
      hitSlop={Spacing.two}
      style={style}
      faceStyle={styles.text}>
      <ThemedText type="button" themeColor={tone === 'danger' ? 'danger' : 'body'}>
        {label}
      </ThemedText>
    </Key>
  );
}

const styles = StyleSheet.create({
  face: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: 52,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.four,
  },
  text: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  inactive: {
    opacity: 0.45,
  },
});
