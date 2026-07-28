import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StepProgress } from '@/components/step-progress';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isDraftDirty, useQuoteDraft } from '@/context/quote-draft';
import { useTheme } from '@/hooks/use-theme';

type QuoteStepScreenProps = {
  // 1-based position in the flow; drives the progress indicator.
  step: number;
  // Micro-label above the title (e.g. the room being quoted).
  overline?: string;
  title: string;
  description: string;
  children: ReactNode;
  // The action row (usually a <StepFooter />), pinned below the content.
  footer: ReactNode;
};

// Common chrome for every quote step: scroll container, safe-area padding, the
// step progress bar, and a consistent title block. Each step supplies its own
// body and footer.
//
// Note the overline is muted, not accent — the progress bar directly above it
// is already this screen's single accent element.
export function QuoteStepScreen({
  step,
  overline,
  title,
  description,
  children,
  footer,
}: QuoteStepScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft, reset } = useQuoteDraft();

  // Leave the flow the same way "Done" does — clear the draft, then unwind the
  // whole modal stack back to Home. Anything short of dismissTo would leave the
  // wizard's earlier steps on the stack.
  function leave() {
    reset();
    router.dismissTo('/');
  }

  // Confirm only when there's something to lose. An untouched draft closes
  // straight away — a dialog there is pure friction — but any entered value
  // gets a destructive confirm, since nothing in this flow is persisted until
  // Done and closing would silently bin it.
  function close() {
    if (!isDraftDirty(draft)) {
      leave();
      return;
    }
    Alert.alert('Discard this quote?', "You haven't saved it yet, so your progress will be lost.", [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: leave },
    ]);
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.five },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        {/* Close sits above the progress bar, right-aligned — the flow is a
            modal over the tabs and swiping down only dismisses the topmost
            screen, so without this there is no way out before Summary. */}
        <View style={styles.chrome}>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close and discard this quote"
            hitSlop={Spacing.two}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <ThemedText type="heading" themeColor="body">
              ✕
            </ThemedText>
          </Pressable>
        </View>

        <StepProgress current={step} />

        <View style={styles.header}>
          {overline && <ThemedText type="label">{overline}</ThemedText>}
          <ThemedText type="title">{title}</ThemedText>
          <ThemedText themeColor="body">{description}</ThemedText>
        </View>

        {children}

        {footer}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.five,
  },
  chrome: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    // Pull the close button up into the top padding so it doesn't add a full
    // gap of its own above the progress bar.
    marginBottom: -Spacing.four,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -Spacing.three,
  },
  header: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.5,
  },
});
