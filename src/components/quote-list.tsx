import { useRouter } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Divider } from '@/components/divider';
import { Panel } from '@/components/panel';
import { QuoteActionsDialog } from '@/components/quote-actions-dialog';
import { QuoteRow, quoteLabel } from '@/components/quote-row';
import { ThemedText } from '@/components/themed-text';
import { CURRENCY_CODE } from '@/constants/quote';
import { Spacing } from '@/constants/theme';
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

/**
 * A saved-quotes list mounted on its own panel, with the stamped section header
 * and every non-happy state (loading / error / empty) handled in one place, so
 * Home and the Quotes tab can't drift apart.
 *
 * No mock fallback anywhere: fake history with fake totals would mislead, so an
 * error just says so.
 */
export function QuoteListPanel({
  label,
  quotes,
  isLoading,
  isError,
  errorText,
  emptyText,
}: {
  label: string;
  quotes: RecentQuote[];
  isLoading: boolean;
  isError: boolean;
  errorText: string;
  emptyText: string;
}) {
  return (
    <Panel style={styles.panel}>
      <View style={styles.header}>
        <ThemedText type="label">{label}</ThemedText>
        {/* Currency stated once here so the rows can show bare figures. */}
        {quotes.length > 0 && <ThemedText type="label">{CURRENCY_CODE}</ThemedText>}
      </View>
      <Divider />

      {isLoading ? (
        <View style={styles.status}>
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <ThemedText type="caption" style={styles.message}>
          {errorText}
        </ThemedText>
      ) : quotes.length > 0 ? (
        <QuoteList quotes={quotes} />
      ) : (
        <ThemedText type="caption" style={styles.message}>
          {emptyText}
        </ThemedText>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: {
    // Rows bring their own vertical padding; keep the panel's lighter so the
    // first and last rows don't float.
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Clear the corner screws, which sit 12pt in from the top.
    paddingTop: Spacing.two,
  },
  status: {
    paddingVertical: Spacing.three,
    alignItems: 'flex-start',
  },
  message: {
    paddingVertical: Spacing.three,
  },
});
