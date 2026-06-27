import { useRouter } from 'expo-router';

import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuoteDraft } from '@/context/quote-draft';

// Step 3 — Materials. Placeholder; the full selectable catalogue with a
// running subtotal is built out in a later pass.
export default function MaterialsScreen() {
  const router = useRouter();
  const { draft } = useQuoteDraft();

  return (
    <QuoteStepScreen
      step={3}
      overline={draft.jobType ?? 'New quote'}
      title="Pick materials"
      description="Choose what the job needs — we'll tally it up as you go."
      footer={
        <StepFooter
          primaryLabel="Continue"
          onPrimary={() => router.push('/labour')}
          onBack={() => router.back()}
        />
      }>
      <ThemedView>
        <ThemedText themeColor="textSecondary">Materials step — coming together next.</ThemedText>
      </ThemedView>
    </QuoteStepScreen>
  );
}
