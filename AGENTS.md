# Expo HAS CHANGED

This project uses **Expo SDK 57** (`expo@57`). Read the exact versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before writing any code.

The SDK tracks whatever the maintainer's Expo Go runs, because that phone is the only
test device. Expo Go auto-updated itself to SDK 57 on 2026-09-18 and the project had to
follow the same day — it was pinned to 54 until then. Don't upgrade on your own
initiative; if Expo Go forces it again, migrate properly rather than pinning around it.

## expo-router no longer uses react-navigation

As of **SDK 56**, `expo-router` dropped its `@react-navigation/*` dependencies for a
native implementation (`standard-navigation`), and **application code may not import from
`@react-navigation/*` at all** — the bundler errors out. There are no `@react-navigation`
packages in `package.json` any more; don't add them back.

The runtime API is unchanged, so `Stack`, `Stack.Protected`, `NativeTabs`, `useRouter`
and friends are imported from `expo-router` exactly as before. What moved is the themes:

```ts
// Wrong — bundler error.
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// Right.
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
```

There is a compat entry (`expo-router/react-navigation`, plus `expo-router/js-stack`,
`/js-tabs`, `/js-top-tabs`) for third-party code, but everything it re-exports is marked
deprecated for removal in a future SDK. Prefer the `expo-router` root export.

**Never** set `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` to get past the bundler error.
It exists for third-party packages that still import react-navigation, not for app code.

## React Compiler lint rules are strict

`app.json` sets `reactCompiler: true`, and `eslint-config-expo@57` ships
`eslint-plugin-react-hooks@7`, whose rules are enforced as errors:

- **No reading or writing a ref during render** (`react-hooks/refs`). To remember a value
  across renders where a ref used to do the job, set state during render behind a guard
  that stops it looping — see `src/app/(quote)/_layout.tsx`.
- **No `setState` synchronously in an effect** (`react-hooks/set-state-in-effect`). For a
  prop-change reset, adjust state during render instead (`quote-actions-dialog.tsx`). For
  an async bootstrap, `await` inside an async IIFE so the boundary is visible to the rule
  (`context/auth.tsx`) — a bare `void asyncFn()` is still flagged.
- **`react-hook-form`:** use `useWatch({ control, name })`, not `watch()`. `watch()` reads
  the form's mutable store during render and makes the compiler skip the whole component.

`npm run lint` and `npx tsc --noEmit` are both expected to be **clean**. Neither has known
pre-existing failures any more, so either one going red means you broke it.
