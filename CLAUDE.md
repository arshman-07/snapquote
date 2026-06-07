# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npx expo start          # start dev server (prompts for platform)
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
npx expo start --web    # browser
npm run lint            # ESLint via expo lint
npm run reset-project   # move starter code to app-example/, blank out src/app/
```

There is no test suite configured yet.

## Architecture

### Source layout

All application code lives under `src/`. The TypeScript path alias `@/*` maps to `src/*` and `@/assets/*` maps to `assets/`.

### Routing

Expo Router with file-based routing. Route files are in `src/app/`:
- `_layout.tsx` — root layout; wraps the app in `ThemeProvider` and renders `AnimatedSplashOverlay` + `AppTabs`
- `index.tsx` — Home tab
- `explore.tsx` — Explore tab

### Platform-specific files

Web overrides use the `.web.tsx` suffix and are resolved automatically by Metro. Currently:
- `src/components/app-tabs.tsx` (native) vs `app-tabs.web.tsx` (web sidebar nav)
- `src/components/animated-icon.tsx` (native) vs `animated-icon.web.tsx` (web)
- `src/hooks/use-color-scheme.ts` vs `use-color-scheme.web.ts`

### Theming

`src/constants/theme.ts` exports all design tokens:
- `Colors` — `{ light, dark }` objects with keys `text`, `background`, `backgroundElement`, `backgroundSelected`, `textSecondary`
- `Fonts` — platform-specific font family map (`sans`, `serif`, `rounded`, `mono`)
- `Spacing` — numeric scale (`half`=2 … `six`=64)
- `BottomTabInset`, `MaxContentWidth` — layout constants

Use `useTheme()` (`src/hooks/use-theme.ts`) to get the active color object. `ThemedText` and `ThemedView` are the primary styled primitives and accept a `themeColor` prop keyed to `ThemeColor`.

### Navigation

Native (iOS/Android) tabs use `NativeTabs` from `expo-router/unstable-native-tabs`. Web uses `Tabs`/`TabList`/`TabTrigger`/`TabSlot` from `expo-router/ui` with a custom horizontal top bar.

### Animations

Animations are built with `react-native-reanimated` Keyframes. The native splash overlay uses `react-native-worklets` (`scheduleOnRN`) to bridge the worklet callback back to the React thread.

### Experiments enabled

`app.json` has `typedRoutes: true` (typed `href` props) and `reactCompiler: true`.
