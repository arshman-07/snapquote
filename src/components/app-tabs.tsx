import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { fontFor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The platform's own tab bar, kept native on purpose (behaviour, blur and
// accessibility come for free) and only tinted into the industrial palette:
// chassis-grey bar, the active tab lit in the accent like an indicator lamp,
// labels in the UI face. It can't be embossed — that's the accepted trade-off.
export default function AppTabs() {
  const theme = useTheme();
  const labelFont = fontFor('sans', 600);

  return (
    <NativeTabs
      backgroundColor={theme.background}
      shadowColor={theme.groove}
      tintColor={theme.accent}
      // Android's pill behind the active tab reads as a recessed well.
      indicatorColor={theme.recessed}
      iconColor={{ default: theme.muted, selected: theme.accent }}
      labelStyle={{
        default: { color: theme.muted, fontFamily: labelFont },
        selected: { color: theme.ink, fontFamily: labelFont },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="quotes">
        <NativeTabs.Trigger.Label>Quotes</NativeTabs.Trigger.Label>
        {/* Placeholder icon — reuses the starter "explore" (compass) asset until
            a proper list/document tab icon is added. */}
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
