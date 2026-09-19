import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fontFor, Radius, Spacing } from '@/constants/theme';
import { useShadows, useTheme } from '@/hooks/use-theme';

type DataInputProps = TextInputProps & {
  /** Validation failed — the backlight turns to the danger colour. */
  error?: boolean;
  /** Trailing unit/hint printed inside the slot (e.g. "ft", "/ day"). */
  suffix?: ReactNode;
};

/**
 * A data slot machined into the chassis (elevation -1): an inset well with no
 * border, set in mono like a terminal readout. Focusing it switches on an
 * accent "backlight" ring around the well; an error holds it on in `danger`.
 */
export function DataInput({
  error,
  suffix,
  multiline,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: DataInputProps) {
  const theme = useTheme();
  const shadows = useShadows();
  const [focused, setFocused] = useState(false);

  const ring = error ? theme.danger : focused ? theme.accent : null;

  return (
    <View
      style={[
        styles.well,
        multiline && styles.multiline,
        {
          backgroundColor: theme.background,
          boxShadow: ring ? `${shadows.recessed}, 0px 0px 0px 2px ${ring}` : shadows.recessed,
        },
      ]}>
      <TextInput
        multiline={multiline}
        // Placeholders sit at half strength so they never read as entered data.
        placeholderTextColor={`${theme.muted}80`}
        selectionColor={theme.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          { color: theme.ink, fontFamily: fontFor('mono', 500) },
          style,
        ]}
        {...inputProps}
      />
      {suffix}
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
  },
  multiline: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.three,
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    fontSize: 17,
  },
  multilineInput: {
    minHeight: 72,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
});
