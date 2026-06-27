import { useRouter } from 'expo-router';

import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuoteDraft } from '@/context/quote-draft';

// Step 4 — Labour. Placeholder; hours + hourly rate inputs with a live labour
// cost are built out in a later pass.
export default function LabourScreen() {
  const router = useRouter();
  const { draft } = useQuoteDraft();

  return (
    <QuoteStepScreen
      step={4}
      overline={draft.jobType ?? 'New quote'}
      title="Add labour"
      description="Roughly how long will it take, and at what rate?"
      footer={
        <StepFooter
          primaryLabel="Continue"
          onPrimary={() => router.push('/summary')}
          onBack={() => router.back()}
        />
      }>
      <ThemedView>
        <ThemedText themeColor="textSecondary">Labour step — coming together next.</ThemedText>
      </ThemedView>
    </QuoteStepScreen>
  );
}
