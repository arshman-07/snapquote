# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Code comments

When writing code, add comments that explain what's going on. Keep them moderate —
not an essay, not a single cryptic word. The goal is that the maintainer can skim the
code and understand what each part is doing and why. Comment the intent of non-obvious
blocks, not every line.

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

Expo Router with file-based routing. The root `_layout.tsx` is a `Stack` (wrapped in
`ThemeProvider` + `AnimatedSplashOverlay`) so the tabs and the quote flow are siblings:

- `src/app/_layout.tsx` — root `Stack`; hosts `(tabs)` and `(quote)` (the latter presented as a modal)
- `src/app/(tabs)/_layout.tsx` — renders `AppTabs`
  - `(tabs)/index.tsx` — Home tab (`/`)
  - `(tabs)/explore.tsx` — Explore tab (`/explore`)
- `src/app/(quote)/_layout.tsx` — `Stack` wrapped in `QuoteDraftProvider`; the multi-step quote wizard
  - `new-quote.tsx` (`/new-quote`) → `photo.tsx` → `materials.tsx` → `labour.tsx` → `summary.tsx`

Route groups (`(tabs)`, `(quote)`) don't appear in the URL, so the tab paths stay `/` and `/explore`.
The quote flow shares one draft via `QuoteDraftProvider` (`src/context/quote-draft.tsx`) — each step
reads/writes the same `QuoteDraft` instead of threading params. Derived values (area, materials/labour
totals) live alongside it. Shared flow UI: `quote-step-screen`, `step-progress`, `step-footer`. The
Materials step's tiered packages come from `src/constants/materials-mock.ts`, a Phase-1 mock shaped to
the eventual Directus response (swapped for the real call in Phase 3 without UI changes).

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
- `Accent` — single brand blue (`#3c87f7`) for primary actions / progress in the quote flow

Use `useTheme()` (`src/hooks/use-theme.ts`) to get the active color object. `ThemedText` and `ThemedView` are the primary styled primitives and accept a `themeColor` prop keyed to `ThemeColor`.

### Navigation

Native (iOS/Android) tabs use `NativeTabs` from `expo-router/unstable-native-tabs`. Web uses `Tabs`/`TabList`/`TabTrigger`/`TabSlot` from `expo-router/ui` with a custom horizontal top bar.

### Animations

Animations are built with `react-native-reanimated` Keyframes. The native splash overlay uses `react-native-worklets` (`scheduleOnRN`) to bridge the worklet callback back to the React thread.

### Experiments enabled

`app.json` has `typedRoutes: true` (typed `href` props) and `reactCompiler: true`.
