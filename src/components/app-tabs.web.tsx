import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="quotes" href="/quotes" asChild>
            <TabButton>Quotes</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

// Selection is carried by weight and colour rather than a filled pill — a row
// of rounded chips inside a rounded bar is exactly the card-in-card stacking
// the design rules call out.
export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.tabButtonView}>
        <ThemedText type={isFocused ? 'bodyBold' : 'body'} themeColor={isFocused ? 'ink' : 'muted'}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();

  return (
    <ThemedView {...props} style={[styles.tabListContainer, { borderBottomColor: theme.hairline }]}>
      <View style={styles.innerContainer}>
        <ThemedText type="bodyBold" style={styles.brandText}>
          SnapQuote
        </ThemedText>

        {props.children}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.6,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
  },
});
