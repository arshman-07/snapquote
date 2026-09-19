import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/button';
import { Divider } from '@/components/divider';
import { Field } from '@/components/field';
import { Led } from '@/components/led';
import { Panel } from '@/components/panel';
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
import { useShadows, useTheme } from '@/hooks/use-theme';

// Step 3 — Materials. The user describes the work, then we present three
// itemized packages (Budget / Standard / Premium) to choose from. In Phase 1
// the options come from a deterministic mock; Phase 3 swaps in a Directus call
// that runs the AI + retailer lookup. The response shape is identical either way.
//
// Each package is a price-tag panel hung from a punched hole; the chosen one is
// backlit with an accent ring and a lit "Selected" LED.
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
      <Field
        label="Describe the work"
        value={draft.materialBrief}
        onChangeText={(materialBrief) => updateDraft({ materialBrief })}
        placeholder={briefPlaceholder(draft.jobType)}
        multiline
      />

      {/* Optional ZIP — regional pricing once the lookup is real. */}
      <Field
        label="ZIP code (optional)"
        value={draft.materialZip}
        onChangeText={(materialZip) => updateDraft({ materialZip })}
        placeholder="e.g. 78701"
        keyboardType="number-pad"
        maxLength={5}
        suffix="for local pricing"
      />

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

// One selectable package, styled as a hanging price tag: a punched hole at
// the top, header (title / tagline / subtotal), the itemized list separated by
// grooves, and a select key. The chosen card keeps its panel shadow and gains an
// accent backlight ring plus a lit "Selected" LED — never colour alone.
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
  const shadows = useShadows();

  return (
    <Panel
      screws={false}
      style={[
        styles.card,
        selected && { boxShadow: `${shadows.card}, 0px 0px 0px 2px ${theme.accent}` },
      ]}>
      {/* Hanging hole punched through the tag. */}
      <View
        style={[styles.hole, { backgroundColor: theme.recessed, boxShadow: shadows.dimple }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

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
          <Led tone="accent" label="Selected" />
        </View>
      ) : (
        <SecondaryButton label="Select this package" onPress={onSelect} />
      )}
    </Panel>
  );
}

// A single material line: name + price, a plain-English explanation, the
// quantity, and a tappable "Buy at <retailer>" link. The link is ink with an
// external-link glyph rather than accent: red fails contrast at caption size.
function LineItem({ item }: { item: MaterialLineItem }) {
  const theme = useTheme();

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
          hitSlop={Spacing.three}
          onPress={() => void WebBrowser.openBrowserAsync(item.url)}
          style={({ pressed }) => [styles.buyLink, pressed && styles.pressed]}>
          <ThemedText type="caption" themeColor="ink" style={styles.buyLinkText}>
            Buy at {item.retailer}
          </ThemedText>
          <ExternalLink size={14} strokeWidth={2} color={theme.ink} />
        </Pressable>
      </View>
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
  results: {
    gap: Spacing.four,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    gap: Spacing.three,
    // Room for the hanging hole above the header.
    paddingTop: Spacing.five + Spacing.two,
  },
  hole: {
    position: 'absolute',
    top: Spacing.three,
    alignSelf: 'center',
    width: 12,
    height: 12,
    borderRadius: Radius.full,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  buyLinkText: {
    fontWeight: '600',
  },
  selectedRow: {
    minHeight: 52,
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
