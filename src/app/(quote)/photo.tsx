import { useRouter } from 'expo-router';

import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuoteDraft } from '@/context/quote-draft';

// Step 2 — Photo capture. Placeholder for now (real camera/library capture
// lands in Phase 3 with expo-image-picker). Built out fully in a later pass.
export default function PhotoScreen() {
  const router = useRouter();
  const { draft } = useQuoteDraft();

  return (
    <QuoteStepScreen
      step={2}
      overline={draft.jobType ?? 'New quote'}
      title="Add a photo"
      description="A quick snap of the space helps us sanity-check the estimate."
      footer={
        <StepFooter
          primaryLabel="Continue"
          onPrimary={() => router.push('/materials')}
          onBack={() => router.back()}
        />
      }>
      <ThemedView>
        <ThemedText themeColor="textSecondary">Photo step — coming together next.</ThemedText>
      </ThemedView>
    </QuoteStepScreen>
  );
}
