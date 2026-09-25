import { StyleSheet, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/button';
import { Spacing } from '@/constants/theme';

type StepFooterProps = {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  // When provided, a "Back" affordance is shown to the left of the primary
  // button. Omitted on the first step (the flow is dismissed by swiping down).
  onBack?: () => void;
};

// Shared bottom action row for the quote wizard. Keeps the primary call to
// action identical on every step: the red accent key (the one thing to press),
// with a grey chassis "Back" key beside it from step 2 on.
export function StepFooter({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  onBack,
}: StepFooterProps) {
  return (
    <View style={styles.row}>
      {onBack && <SecondaryButton label="Back" onPress={onBack} style={styles.back} />}
      <PrimaryButton
        label={primaryLabel}
        onPress={onPrimary}
        disabled={primaryDisabled}
        loading={primaryLoading}
        style={styles.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  back: {
    flexShrink: 0,
  },
  primary: {
    flex: 1,
  },
});
