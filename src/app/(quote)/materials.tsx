import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SecondaryButton } from '@/components/button';
import { Divider } from '@/components/divider';
import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { CURRENCY_CODE, formatAmount } from '@/constants/quote';
import {
  buildMaterialPackages,
  type MaterialLineItem,
  type MaterialPackage,
} from '@/constants/materials-mock';
import { Radius, Spacing } from '@/constants/theme';
import { getArea, useQuoteDraft } from '@/context/quote-draft';
import { useTheme } from '@/hooks/use-theme';

// Step 3 — Materials. The user describes the work, then we present three
// itemized packages (Budget / Standard / Premium) to choose from. In Phase 1
// the options come from a deterministic mock; Phase 3 swaps in a Directus call
// that runs the AI + retailer lookup. The response shape is identical either way.
//
// This is the one screen where the accent marks selection: the chosen tier card
// is one of its three sanctioned uses.
export default function MaterialsScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useQuoteDraft();
  const area = getArea(draft);

  // If a tier is already chosen (e.g. returning from a later step), rebuild the
  // packages immediately so the selection is visible without re-fetching.
  const [packages, setPackages] = useState<MaterialPackage[] | null>(() =>
    draft.selectedTier
      ? buildMaterialPackages({ jobType: draft.jobType, area, unit: draft.unit })
      : null,
  );
  const [loading, setLoading] = useState(false);

  function getOptions() {
    setLoading(true);
    // Phase 1: simulate the server round-trip so the loading UX is real.
    setTimeout(() => {
      setPackages(buildMaterialPackages({ jobType: draft.jobType, area, unit: draft.unit }));
      setLoading(false);
    }, 700);
  }

  // Can't continue until they've fetched options and picked one.
  const canContinue = draft.selectedTier !== null && packages !== null;

  return (
    <QuoteStepScreen
      step={3}
      overline={draft.jobType ?? 'New quote'}
      title="Material options"
      description="Tell us about the work and we'll pull together three options to choose from."
      footer={
        <StepFooter
          primaryLabel="Continue"
          primaryDisabled={!canContinue}
          onPrimary={() => router.push('/labour')}
          onBack={() => router.back()}
        />
      }>
      {/* Free-text brief — feeds the AI lookup in Phase 3. */}
      <View style={styles.section}>
        <ThemedText type="label">Describe the work</ThemedText>
        <BriefInput
          value={draft.materialBrief}
          onChangeText={(materialBrief) => updateDraft({ materialBrief })}
          jobType={draft.jobType}
        />
      </View>

      {/* Optional ZIP — regional pricing once the lookup is real. */}
      <View style={styles.section}>
        <ThemedText type="label">ZIP code (optional)</ThemedText>
        <ZipInput
          value={draft.materialZip}
          onChangeText={(materialZip) => updateDraft({ materialZip })}
        />
      </View>

      {/* Fetch / refresh options. Secondary, not primary — "Continue" in the
          footer is this screen's primary action and there is only ever one. */}
      <SecondaryButton
        label={loading ? 'Finding materials…' : packages ? 'Refresh options' : 'Get material options'}
        onPress={getOptions}
        disabled={loading}
      />

      {/* Three package cards. */}
      {packages && !loading && (
        <View style={styles.results}>
          <View style={styles.resultsHeader}>
            <ThemedText type="label">Options</ThemedText>
            <ThemedText type="label">{CURRENCY_CODE}</ThemedText>
          </View>

          {packages.map((pkg) => (
            <PackageCard
              key={pkg.tier}
              pkg={pkg}
              selected={draft.selectedTier === pkg.tier}
              onSelect={() => updateDraft({ selectedTier: pkg.tier })}
            />
          ))}

          <ThemedText type="caption" themeColor="muted" style={styles.freshness}>
            AI estimate · approximate prices, as of {formatDate(packages[0].pricedAt)}
          </ThemedText>
        </View>
      )}
    </QuoteStepScreen>
  );
}

// One selectable package: header (title / tagline / subtotal), the itemized
// list, and a select action. These sit directly on the page background — they
// are the content, not a wrapper around it — so they don't count as card-in-card.
function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: MaterialPackage;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: selected ? theme.accent : theme.hairline,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeading}>
          <ThemedText type="heading">{pkg.title}</ThemedText>
          <ThemedText type="caption">{pkg.tagline}</ThemedText>
        </View>
        <ThemedText type="heading" tabular>
          {formatAmount(pkg.subtotal)}
        </ThemedText>
      </View>

      <View style={styles.items}>
        {pkg.items.map((item, i) => (
          <Fragment key={item.name}>
            {i > 0 && <Divider />}
            <LineItem item={item} />
          </Fragment>
        ))}
      </View>

      {selected ? (
        <View style={styles.selectedRow}>
          <ThemedText type="label" themeColor="accent">
            Selected
          </ThemedText>
        </View>
      ) : (
        <Pressable
          onPress={onSelect}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.selectButton,
            { borderColor: theme.hairline },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="bodyBold" themeColor="body">
            Select this package
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

// A single material line: name + price, a plain-English explanation, the
// quantity, and a tappable "Buy at <retailer>" link. The link is `ink`, not
// accent — the selected-card border is already this screen's accent.
function LineItem({ item }: { item: MaterialLineItem }) {
  return (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <ThemedText type="bodyBold" style={styles.itemName}>
          {item.name}
        </ThemedText>
        <ThemedText type="body" tabular>
          {formatAmount(item.price)}
        </ThemedText>
      </View>
      <ThemedText type="caption">{item.explanation}</ThemedText>
      <View style={styles.itemMeta}>
        <ThemedText type="label">{item.quantity}</ThemedText>
        <Pressable
          accessibilityRole="link"
          hitSlop={Spacing.two}
          onPress={() => void WebBrowser.openBrowserAsync(item.url)}>
          <ThemedText type="caption" themeColor="ink" style={styles.buyLink}>
            Buy at {item.retailer} ›
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function BriefInput({
  value,
  onChangeText,
  jobType,
}: {
  value: string;
  onChangeText: (text: string) => void;
  jobType: string | null;
}) {
  const theme = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={briefPlaceholder(jobType)}
      placeholderTextColor={theme.muted}
      multiline
      style={[
        styles.briefInput,
        { color: theme.ink, backgroundColor: theme.surface, borderColor: theme.hairline },
      ]}
    />
  );
}

function ZipInput({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  const theme = useTheme();

  return (
    <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="e.g. 78701"
        placeholderTextColor={theme.muted}
        keyboardType="number-pad"
        maxLength={5}
        style={[styles.input, { color: theme.ink }]}
      />
      <ThemedText type="caption" themeColor="muted">
        for local pricing
      </ThemedText>
    </View>
  );
}

// A gentle, job-specific prompt so the field doesn't feel like a blank box.
function briefPlaceholder(jobType: string | null): string {
  const room = jobType ? jobType.toLowerCase() : 'room';
  return `e.g. Re-tiling the ${room} floor and repainting the walls`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  briefInput: {
    minHeight: 88,
    fontSize: 17,
    lineHeight: 24,
    textAlignVertical: 'top',
    padding: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 50,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 17,
  },
  results: {
    gap: Spacing.three,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    borderRadius: Radius.sheet,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  cardHeading: {
    flex: 1,
    gap: Spacing.one,
  },
  items: {
    gap: Spacing.three,
  },
  item: {
    gap: Spacing.one,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  itemName: {
    flex: 1,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  buyLink: {
    fontWeight: '600',
  },
  selectButton: {
    height: 44,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRow: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freshness: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
