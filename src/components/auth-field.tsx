import { Platform, StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Shared error red for the auth screens — the theme has no error key, so this
// mirrors the same local red the quote flow uses for inline field errors.
export const AuthErrorColor = '#e5484d';

// One labelled auth input, shared by the login and sign-up screens so their
// field chrome stays identical (same look as the quote flow's inputs).
export function AuthField({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.inputRow}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          {...inputProps}
        />
      </ThemedView>
      {error && (
        <ThemedText type="small" style={{ color: AuthErrorColor }}>
          {error}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? Spacing.three : Spacing.two,
    fontSize: 16,
  },
});
