import { useId, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Key } from '@/components/button';
import { useKeyboardReveal } from '@/components/keyboard-reveal';
import { ThemedText } from '@/components/themed-text';
import { fontFor, Radius, Spacing } from '@/constants/theme';
import { useShadows, useTheme } from '@/hooks/use-theme';

type DataInputProps = TextInputProps & {
  /** Forwarded to the TextInput, so a form can move focus between fields. */
  ref?: Ref<TextInput>;
  /** Validation failed — the backlight turns to the danger colour. */
  error?: boolean;
  /** Trailing unit/hint printed inside the slot (e.g. "ft", "/ day"). */
  suffix?: ReactNode;
  /**
   * Move to the next field. Turns the keyboard's action key into "Next" and
   * keeps the keyboard up while focus hops, instead of closing it.
   */
  onNext?: () => void;
};

// iOS number pads have no return key at all, so "Next"/"Done" can't live on
// the keyboard itself — those fields get the accessory bar below instead.
const NUMERIC_KEYBOARDS = new Set(['number-pad', 'decimal-pad', 'numeric', 'phone-pad']);

/**
 * A data slot machined into the chassis (elevation -1): an inset well with no
 * border, set in mono like a terminal readout. Focusing it switches on an
 * accent "backlight" ring around the well; an error holds it on in `danger`.
 *
 * Inside a screen that provides `KeyboardRevealContext`, focusing a slot also
 * scrolls it up clear of the keyboard.
 */
export function DataInput({
  ref,
  error,
  suffix,
  onNext,
  multiline,
  style,
  onFocus,
  onBlur,
  onSubmitEditing,
  returnKeyType,
  keyboardType,
  ...inputProps
}: DataInputProps) {
  const theme = useTheme();
  const shadows = useShadows();
  const reveal = useKeyboardReveal();
  const wellRef = useRef<View>(null);
  const [focused, setFocused] = useState(false);
  const accessoryId = useId();

  const ring = error ? theme.danger : focused ? theme.accent : null;
  const needsAccessory =
    Platform.OS === 'ios' && !multiline && NUMERIC_KEYBOARDS.has(keyboardType ?? '');

  return (
    <View
      ref={wellRef}
      style={[
        styles.well,
        multiline && styles.multiline,
        {
          backgroundColor: theme.background,
          boxShadow: ring ? `${shadows.recessed}, 0px 0px 0px 2px ${ring}` : shadows.recessed,
        },
      ]}>
      <TextInput
        ref={ref}
        multiline={multiline}
        keyboardType={keyboardType}
        // Placeholders sit at half strength so they never read as entered data.
        placeholderTextColor={`${theme.muted}80`}
        selectionColor={theme.accent}
        returnKeyType={onNext ? 'next' : returnKeyType}
        // With a next field, submitting hops focus rather than closing the
        // keyboard — otherwise it would drop and pop straight back up.
        submitBehavior={onNext ? 'submit' : undefined}
        onSubmitEditing={onNext ? () => onNext() : onSubmitEditing}
        inputAccessoryViewID={needsAccessory ? accessoryId : undefined}
        onFocus={(e) => {
          setFocused(true);
          reveal?.(wellRef.current);
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
      {needsAccessory && <KeyboardBar nativeID={accessoryId} onNext={onNext} />}
    </View>
  );
}

/**
 * The strip docked on top of an iOS number pad: a stamped legend on the left,
 * then a "Next" key (when there is a next field) and a flat "Done" that closes
 * the keyboard. Same chassis plastic as the rest of the app.
 */
function KeyboardBar({ nativeID, onNext }: { nativeID: string; onNext?: () => void }) {
  const theme = useTheme();

  return (
    <InputAccessoryView nativeID={nativeID} backgroundColor={theme.background}>
      <View style={[styles.bar, { borderTopColor: theme.groove }]}>
        <ThemedText type="label" style={styles.barLegend}>
          Data entry
        </ThemedText>
        {onNext && (
          <Key onPress={onNext} faceStyle={styles.barKey}>
            <ThemedText type="button">Next</ThemedText>
          </Key>
        )}
        <Key variant="ghost" onPress={() => Keyboard.dismiss()} faceStyle={styles.barKey}>
          <ThemedText type="button" themeColor="body">
            Done
          </ThemedText>
        </Key>
      </View>
    </InputAccessoryView>
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
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  barLegend: {
    flex: 1,
  },
  barKey: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
});
