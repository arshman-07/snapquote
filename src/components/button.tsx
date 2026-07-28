import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

/**
 * The primary action. Filled with `ink` (near-black in light mode, near-white
 * in dark) — deliberately NOT the orange accent, which stays reserved for
 * progress, selection and status. There should be exactly one of these visible
 * at a time.
 */
export function PrimaryButton({ label, onPress, disabled, loading, style }: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: theme.ink },
        // Dim rather than grey out: keeps the shape stable and avoids
        // introducing another colour stop just for disabled.
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.onInk} />
      ) : (
        <ThemedText type="bodyBold" themeColor="onInk">
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

/** Lower-emphasis action — hairline outline, no fill. Pairs with PrimaryButton. */
export function SecondaryButton({ label, onPress, disabled, style }: ButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        styles.outlined,
        { borderColor: theme.hairline },
        disabled && styles.inactive,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <ThemedText type="bodyBold">{label}</ThemedText>
    </Pressable>
  );
}

/**
 * A text-only action for tertiary things (skip, cancel, "use a different
 * account"). No fill, no border — it should recede.
 *
 * `tone="danger"` colours it with the `danger` stop for destructive actions.
 * Destructive still means text-only, not a red fill: a filled red button
 * competes with the primary action and invites the mis-tap it warns about.
 */
export function TextButton({
  label,
  onPress,
  disabled,
  style,
  tone = 'default',
}: ButtonProps & { tone?: 'default' | 'danger' }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={Spacing.two}
      style={({ pressed }) => [
        styles.text,
        disabled && styles.inactive,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <ThemedText type="link" themeColor={tone === 'danger' ? 'danger' : 'body'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Full-width row wrapper so footers can lay buttons out consistently. */
export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactive: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
});
