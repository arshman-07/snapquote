import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Keyboard, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Key } from '@/components/button';
import { KeyboardRevealContext } from '@/components/keyboard-reveal';
import { StepProgress } from '@/components/step-progress';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
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
// The overline is a muted stamped label, not accent — the lit progress pipe
// above it is already doing the signalling.
//
// Keyboard handling: when any field inside gains focus it asks (through
// `KeyboardRevealContext`) to be scrolled up to just below the top of the
// screen, well clear of the keyboard. While the keyboard is open the content
// gets that much extra bottom padding, so even the last fields have room to
// scroll that far.

// How far below the top of the scroll view a revealed field's well lands —
// enough to keep its label and a little context above it visible.
const REVEAL_OFFSET = Spacing.six + Spacing.four;
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

  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  // The last field that asked to be revealed, so it can be re-revealed once the
  // keyboard has opened and the extra padding exists to scroll into.
  const revealedRef = useRef<View | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const reveal = useCallback((node: View | null) => {
    revealedRef.current = node;
    const content = contentRef.current;
    if (!node || !content) return;
    // Position relative to the content column; the column itself starts at
    // the top padding, so aligning to `y` minus the offset puts the well
    // REVEAL_OFFSET (plus that padding) below the top edge.
    node.measureLayout(content, (_x, y) => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - REVEAL_OFFSET), animated: true });
    });
  }, []);

  useEffect(() => {
    // iOS announces the keyboard before it moves (`will`), Android only after.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      revealedRef.current = null;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Once the keyboard padding has rendered, scroll the focused field again —
  // the first attempt (on focus) can be cut short when the content isn't yet
  // tall enough to scroll that far.
  useEffect(() => {
    if (keyboardHeight > 0) reveal(revealedRef.current);
  }, [keyboardHeight, reveal]);

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
    <KeyboardRevealContext value={reveal}>
      <ScrollView
        ref={scrollRef}
        style={[styles.scroll, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.four,
            paddingBottom: insets.bottom + Spacing.five + keyboardHeight,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Dragging the page down pulls the keyboard away with it.
        keyboardDismissMode="interactive">
        <View ref={contentRef} style={styles.container}>
          {/* Close sits above the progress bar, right-aligned — the flow is a
            modal over the tabs and swiping down only dismisses the topmost
            screen, so without this there is no way out before Summary. */}
          <View style={styles.chrome}>
            <Key
              onPress={close}
              accessibilityLabel="Close and discard this quote"
              faceStyle={styles.close}>
              <X size={20} strokeWidth={2} color={theme.body} />
            </Key>
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
    </KeyboardRevealContext>
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
    // Tighten the gap between the close key and the progress pipe below it.
    marginBottom: -Spacing.three,
  },
  // A round chassis key — 44pt across plus its shadow, a comfortable target.
  close: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
  },
  header: {
    gap: Spacing.two,
  },
});
