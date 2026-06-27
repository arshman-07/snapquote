import { type ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StepProgress } from '@/components/step-progress';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type QuoteStepScreenProps = {
  // 1-based position in the flow; drives the progress indicator.
  step: number;
  // Small uppercase kicker above the title (e.g. the room being quoted).
  overline?: string;
  title: string;
  description: string;
  children: ReactNode;
  // The action row (usually a <StepFooter />), pinned to the bottom of the content.
  footer: ReactNode;
};

// Common chrome for every quote step: themed scroll container, safe-area
// padding, the step progress bar, and a consistent title block. Each step just
// supplies its own body and footer.
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

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.five },
      ]}
      keyboardShouldPersistTaps="handled">
      <ThemedView style={styles.container}>
        <StepProgress current={step} />

        <ThemedView style={styles.header}>
          {overline && (
            <ThemedText type="smallBold" style={[styles.overline, { color: Accent }]}>
              {overline}
            </ThemedText>
          )}
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText themeColor="textSecondary">{description}</ThemedText>
        </ThemedView>

        {children}

        {footer}
      </ThemedView>
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
  header: {
    gap: Spacing.one,
  },
  overline: {
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 12,
  },
});
