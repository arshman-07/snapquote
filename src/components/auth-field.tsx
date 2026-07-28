import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// One labelled auth input, shared by the login and sign-up screens so their
// field chrome stays identical. The input sits on `surface` with a hairline
// outline — a control, not a content card, so the no-card-in-card rule doesn't
// apply. Errors use the `danger` state colour, never the reserved accent.
export function AuthField({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="label">{label}</ThemedText>
      <TextInput
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          {
            color: theme.ink,
            backgroundColor: theme.surface,
            borderColor: error ? theme.danger : theme.hairline,
          },
        ]}
        {...inputProps}
      />
      {error && (
        <ThemedText type="caption" themeColor="danger">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  input: {
    height: 50,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 17,
  },
});
