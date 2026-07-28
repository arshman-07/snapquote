import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton, SecondaryButton, TextButton } from '@/components/button';
import { Divider } from '@/components/divider';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type QuoteActionsDialogProps = {
  visible: boolean;
  /** Current name, or '' when the quote has never been named. */
  initialName: string;
  /** What the list currently calls this quote — shown as context in the dialog. */
  label: string;
  saving: boolean;
  deleting: boolean;
  failed: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
  /** Leave the dialog and open the full five-step editor for this quote. */
  onEdit: () => void;
  /** Ask to delete. The caller owns the confirmation prompt. */
  onDelete: () => void;
};

// Per-quote actions, opened by tapping a row in either quote list. A centred
// sheet over a dimmed backdrop — no drop shadow; a hairline outline and the
// scrim carry the elevation.
//
// Renaming is inline because it's the common case. The two heavier actions sit
// below a divider, ordered by consequence: editing (reversible) above deleting
// (not). Delete is text-only in `danger` rather than a red fill — a filled red
// button would compete with Save and invite the mis-tap it exists to warn about.
//
// Deliberately dumb: it owns only the text being edited. The mutations, and
// therefore `saving`/`deleting`/`failed`, belong to the list that opened it.
export function QuoteActionsDialog({
  visible,
  initialName,
  label,
  saving,
  deleting,
  failed,
  onCancel,
  onSubmit,
  onEdit,
  onDelete,
}: QuoteActionsDialogProps) {
  const theme = useTheme();
  const [name, setName] = useState(initialName);
  const busy = saving || deleting;

  // Re-seed each time the dialog opens for a (possibly different) quote — the
  // component stays mounted between openings, so state would otherwise be
  // whatever the last edit left behind.
  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent>
      {/* Tapping the scrim dismisses, matching the platform convention. */}
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centre}>
          {/* Swallow presses inside the sheet so they don't reach the scrim. */}
          <Pressable
            onPress={() => {}}
            style={[
              styles.sheet,
              { backgroundColor: theme.background, borderColor: theme.hairline },
            ]}>
            <View style={styles.header}>
              <ThemedText type="heading">Name this quote</ThemedText>
              <ThemedText type="caption">
                Label it however the customer refers to it. Leave it blank to go back to “{label}”.
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText type="label">Name</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                onSubmitEditing={() => !busy && onSubmit(name)}
                placeholder="e.g. Mrs Patel — 14 Oak Ave"
                placeholderTextColor={theme.muted}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                maxLength={120}
                style={[
                  styles.input,
                  {
                    color: theme.ink,
                    backgroundColor: theme.surface,
                    borderColor: theme.hairline,
                  },
                ]}
              />
              {failed && (
                <ThemedText type="caption" themeColor="danger">
                  Couldn&apos;t save that — check your connection and try again.
                </ThemedText>
              )}
            </View>

            <View style={styles.actions}>
              <SecondaryButton
                label="Cancel"
                onPress={onCancel}
                disabled={busy}
                style={styles.action}
              />
              <PrimaryButton
                label="Save"
                onPress={() => onSubmit(name)}
                loading={saving}
                disabled={deleting}
                style={styles.action}
              />
            </View>

            <Divider />

            <View style={styles.secondary}>
              <TextButton label="Edit the full quote" onPress={onEdit} disabled={busy} />
              <TextButton
                label={deleting ? 'Deleting…' : 'Delete quote'}
                onPress={onDelete}
                disabled={busy}
                tone="danger"
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 10, 9, 0.4)',
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: Radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
  secondary: {
    gap: Spacing.two,
  },
});
