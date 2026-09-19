import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Led } from '@/components/led';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// Shared chrome for the login and sign-up screens, so the two stay identical.

/**
 * The product nameplate: a lit power LED next to the stamped brand, like the
 * badge on the front of a piece of equipment. The LED says "the app is on" —
 * deliberately not "online", which we can't know before a request succeeds.
 */
export function Nameplate() {
  return (
    <View style={styles.plate}>
      <Led tone="accent" label="SnapQuote" />
      <ThemedText type="label">Construction quotes</ThemedText>
    </View>
  );
}

/**
 * "Don't have an account yet? Sign up" — the cross-link between the two auth
 * screens. The action is ink, bold and underlined rather than accent: the red
 * fails contrast as small text on the chassis, and the accent belongs to the
 * primary key above it.
 */
export function AuthSwitchLink({
  prompt,
  action,
  href,
}: {
  prompt: string;
  action: string;
  href: Href;
}) {
  return (
    <View style={styles.footRow}>
      <ThemedText type="caption">{prompt} </ThemedText>
      <Link href={href} asChild>
        <Pressable hitSlop={Spacing.three} accessibilityRole="link">
          {({ pressed }) => (
            <ThemedText
              type="caption"
              themeColor={pressed ? 'accent' : 'ink'}
              style={styles.footLink}>
              {action}
            </ThemedText>
          )}
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    // Keeps the ≥48pt touch target honest with the hitSlop above.
    minHeight: 48,
  },
  footLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
