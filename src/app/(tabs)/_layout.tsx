import React from 'react';

import AppTabs from '@/components/app-tabs';

// The tab bar lives one level down from the root Stack so the quote flow can
// be pushed on top of it. `AppTabs` resolves to the native tab bar on
// iOS/Android and the custom top nav on web (`app-tabs.web.tsx`).
export default function TabsLayout() {
  return <AppTabs />;
}
