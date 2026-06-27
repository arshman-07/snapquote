import { useRouter } from 'expo-router';

import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatMoney } from '@/constants/quote';
import { getQuoteTotal, useQuoteDraft } from '@/context/quote-draft';

// Step 5 — Quote summary. Placeholder; the full receipt-style breakdown is
// built out in a later pass. Finishing clears the draft and returns home.
export default function SummaryScreen() {
  const router = useRouter();
  const { draft, reset } = useQuoteDraft();

  const total = getQuoteTotal(draft);

  function finish() {
    reset();
    // Unwind the whole modal flow and land back on the home tab.
    router.dismissTo('/index');
  }

  return (
    <QuoteStepScreen
      step={5}
      overline={draft.jobType ?? 'New quote'}
      title="Your quote"
      description="A rough estimate based on what you entered."
      footer={
        <StepFooter primaryLabel="Done" onPrimary={finish} onBack={() => router.back()} />
      }>
      <ThemedView>
        <ThemedText themeColor="textSecondary">Estimated total</ThemedText>
        <ThemedText type="title">{formatMoney(total)}</ThemedText>
      </ThemedView>
    </QuoteStepScreen>
  );
}
