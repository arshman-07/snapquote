import { type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { DataInput } from '@/components/data-input';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// One labelled input, shared by every form in the app (auth screens, the quote
// wizard, the rename dialog's sibling fields) so field chrome stays identical:
// a stamped mono label over a recessed data slot, an optional unit printed
// inside the slot, and any validation error beneath it in `danger`.
export function Field({
  label,
  error,
  suffix,
  ...inputProps
}: TextInputProps & {
  label: string;
  error?: string;
  /** Unit or hint printed at the end of the slot ("ft", "/ day"). */
  suffix?: string;
  /** Forwarded to the TextInput (e.g. to focus it from the previous field). */
  ref?: Ref<TextInput>;
  /** Focus the next field — see `DataInput`. */
  onNext?: () => void;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="label">{label}</ThemedText>
      <DataInput
        error={!!error}
        suffix={
          suffix ? (
            <ThemedText type="caption" themeColor="muted" tabular>
              {suffix}
            </ThemedText>
          ) : undefined
        }
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
});
