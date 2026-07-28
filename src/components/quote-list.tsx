import { useRouter } from 'expo-router';
import { Fragment, useState } from 'react';
import { Alert, View } from 'react-native';

import { Divider } from '@/components/divider';
import { QuoteActionsDialog } from '@/components/quote-actions-dialog';
import { QuoteRow, quoteLabel } from '@/components/quote-row';
import { type RecentQuote } from '@/hooks/use-recent-quotes';
import { useDeleteQuote } from '@/hooks/use-delete-quote';
import { useUpdateQuote } from '@/hooks/use-update-quote';

// Hairline-separated list of saved quotes, with tap-to-open actions. Shared by
// Home (5 newest) and the Quotes tab (all of them) so the row treatment and the
// action flow can't drift apart between the two.
//
// Owns the rename and delete mutations plus dialog state; the dialog itself is
// presentational.
export function QuoteList({ quotes }: { quotes: RecentQuote[] }) {
  const [target, setTarget] = useState<RecentQuote | null>(null);
  const updateQuote = useUpdateQuote();
  const deleteQuote = useDeleteQuote();
  const router = useRouter();

  function close() {
    setTarget(null);
    // Clear a previous failure so reopening doesn't show a stale error.
    updateQuote.reset();
    deleteQuote.reset();
  }

  function submit(name: string) {
    if (!target) return;
    updateQuote.mutate(
      { id: target.id, customerName: name },
      // Only dismiss on success — on failure the dialog stays open with the
      // typed name intact so the user can retry rather than lose it.
      { onSuccess: close },
    );
  }

  // Hand off to the wizard, which hydrates itself from the id. Dismiss the
  // dialog first so returning from the flow doesn't land back on it.
  function edit() {
    const id = target?.id;
    close();
    if (id !== undefined) router.push(`/new-quote?id=${id}`);
  }

  // Deletion is unrecoverable — there's no trash and no undo — so it always
  // goes through a destructive confirm naming the quote, never a bare tap.
  function confirmDelete() {
    if (!target) return;
    const { id } = target;
    const name = quoteLabel(target);

    Alert.alert(`Delete “${name}”?`, 'This also removes its line items. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteQuote.mutate(id, {
            onSuccess: close,
            onError: () =>
              Alert.alert(
                "Couldn't delete that quote",
                'Check your connection and try again.',
              ),
          }),
      },
    ]);
  }

  return (
    <View>
      {quotes.map((quote, index) => (
        <Fragment key={quote.id}>
          {index > 0 && <Divider />}
          <QuoteRow quote={quote} onPress={() => setTarget(quote)} />
        </Fragment>
      ))}

      <QuoteActionsDialog
        visible={target !== null}
        initialName={target?.customer_name ?? ''}
        label={target ? quoteLabel(target) : ''}
        saving={updateQuote.isPending}
        deleting={deleteQuote.isPending}
        failed={updateQuote.isError}
        onCancel={close}
        onSubmit={submit}
        onEdit={edit}
        onDelete={confirmDelete}
      />
    </View>
  );
}
