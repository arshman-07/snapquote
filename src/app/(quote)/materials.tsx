import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { QuoteStepScreen } from '@/components/quote-step-screen';
import { StepFooter } from '@/components/step-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatMoney } from '@/constants/quote';
import {
  buildMaterialPackages,
  type MaterialLineItem,
  type MaterialPackage,
} from '@/constants/materials-mock';
import { Accent, Spacing } from '@/constants/theme';
import { getArea, useQuoteDraft } from '@/context/quote-draft';
import { useTheme } from '@/hooks/use-theme';

// Step 3 — Materials. The user describes the work, then we present three
// itemized packages (Budget / Standard / Premium) to choose from. In Phase 1
// the options come from a deterministic mock; Phase 3 swaps in a Directus call
// that runs the AI + retailer lookup. The response shape is identical either way.
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
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold">Describe the work</ThemedText>
        <ThemedView type="backgroundElement" style={styles.briefRow}>
          <BriefInput
            value={draft.materialBrief}
            onChangeText={(materialBrief) => updateDraft({ materialBrief })}
            jobType={draft.jobType}
          />
        </ThemedView>
      </ThemedView>

      {/* Optional ZIP — regional pricing once the lookup is real. */}
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold">ZIP code (optional)</ThemedText>
        <ZipInput
          value={draft.materialZip}
          onChangeText={(materialZip) => updateDraft({ materialZip })}
        />
      </ThemedView>

      {/* Fetch / refresh options. */}
      <Pressable onPress={getOptions} disabled={loading} style={({ pressed }) => pressed && styles.pressed}>
        <View style={[styles.fetchButton, { backgroundColor: Accent }, loading && styles.disabled]}>
          {loading ? (
            <View style={styles.fetchLoading}>
              <ActivityIndicator color="#ffffff" />
              <ThemedText type="smallBold" style={styles.onAccent}>
                Finding materials…
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="smallBold" style={styles.onAccent}>
              {packages ? 'Refresh options' : 'Get material options'}
            </ThemedText>
          )}
        </View>
      </Pressable>

      {/* Three package cards. */}
      {packages && !loading && (
        <ThemedView style={styles.results}>
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.tier}
              pkg={pkg}
              selected={draft.selectedTier === pkg.tier}
              onSelect={() => updateDraft({ selectedTier: pkg.tier })}
            />
          ))}
          <ThemedText type="small" themeColor="textSecondary" style={styles.freshness}>
            AI estimate · approximate prices, as of {formatDate(packages[0].pricedAt)}
          </ThemedText>
        </ThemedView>
      )}
    </QuoteStepScreen>
  );
}

// One selectable package: header (title / tagline / subtotal), the itemized
// list, and a select button. The accent border marks the chosen one.
function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: MaterialPackage;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeading}>
          <ThemedText type="smallBold">{pkg.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {pkg.tagline}
          </ThemedText>
        </View>
        <ThemedText type="subtitle" style={{ color: Accent }}>
          {formatMoney(pkg.subtotal)}
        </ThemedText>
      </View>

      <View style={styles.items}>
        {pkg.items.map((item, i) => (
          <LineItem key={item.name} item={item} first={i === 0} />
        ))}
      </View>

      <Pressable onPress={onSelect} style={({ pressed }) => pressed && styles.pressed}>
        {selected ? (
          <View style={[styles.selectButton, { backgroundColor: Accent }]}>
            <ThemedText type="smallBold" style={styles.onAccent}>
              ✓ Selected
            </ThemedText>
          </View>
        ) : (
          <ThemedView type="background" style={styles.selectButton}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Select this package
            </ThemedText>
          </ThemedView>
        )}
      </Pressable>
    </ThemedView>
  );
}

// A single material line: name + price, a plain-English explanation, the
// quantity, and a tappable "Buy at <retailer>" link.
function LineItem({ item, first }: { item: MaterialLineItem; first: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.item,
        !first && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.backgroundSelected,
          paddingTop: Spacing.three,
        },
      ]}>
      <View style={styles.itemHeader}>
        <ThemedText type="small" style={styles.itemName}>
          {item.name}
        </ThemedText>
        <ThemedText type="small">{formatMoney(item.price)}</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {item.explanation}
      </ThemedText>
      <View style={styles.itemMeta}>
        <ThemedText type="small" themeColor="textSecondary">
          {item.quantity}
        </ThemedText>
        <Pressable onPress={() => void WebBrowser.openBrowserAsync(item.url)}>
          <ThemedText type="small" style={{ color: Accent }}>
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
      placeholderTextColor={theme.textSecondary}
      multiline
      style={[styles.briefInput, { color: theme.text }]}
    />
  );
}

function ZipInput({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.inputRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="e.g. 78701"
        placeholderTextColor={theme.textSecondary}
        keyboardType="number-pad"
        maxLength={5}
        style={[styles.input, { color: theme.text }]}
      />
      <ThemedText type="small" themeColor="textSecondary">
        for local pricing
      </ThemedText>
    </ThemedView>
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
  briefRow: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  briefInput: {
    minHeight: 72,
    fontSize: 16,
    textAlignVertical: 'top',
    paddingVertical: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  fetchButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  fetchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  onAccent: {
    color: '#ffffff',
  },
  results: {
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: Accent,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  cardHeading: {
    flex: 1,
    gap: Spacing.half,
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
    fontWeight: '700',
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  selectButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  freshness: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.6,
  },
});
