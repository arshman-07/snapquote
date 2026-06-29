# Frontend — Status

> Living status doc for the SnapQuote frontend. Update as screens and features land.

## Stack

- **Framework:** Expo / React Native (Expo SDK 54)
- **Routing:** Expo Router (file-based, `src/app/`)
- **Styling:** Existing theme tokens (`src/constants/theme.ts`) + `ThemedText` / `ThemedView` primitives
- **Language:** TypeScript (`@/*` → `src/*`)

### Planned for later phases (NOT installed in Phase 1)

| Concern | Library | Phase |
|---|---|---|
| Directus API client | `@directus/sdk` | 2 |
| Server data fetching/caching | `@tanstack/react-query` | 2 |
| Forms + validation | `react-hook-form` + `zod` | 2 |
| Local/UI state (if needed) | `zustand` | 2 |
| Image capture | `expo-image-picker` (+ `expo-camera`) | 3 |

> **Phase 1 rule:** purely static. Hard-coded sample data, no network calls, no data
> libraries. Focus on layout and feel first.

## Screens (planned)

| Screen | Purpose | Status |
|---|---|---|
| New Quote (Dimensions) | Form for dimensions + room/job type | ✅ Built (Phase 1) |
| Photo capture | Take/upload an image of the area (placeholder) | ✅ Built (Phase 1, no real capture) |
| Materials | Brief → 3 tiered packages (budget/standard/premium) | ✅ Built (Phase 1, mock data) |
| Labour | Days on site × daily rate (USD) | ✅ Built (Phase 1) |
| Quote summary | Rough total, broken down (materials + labour) | ✅ Built (Phase 1) |
| Saved quotes | List of past quotes | ⬜ Later |

> All five flow screens are built and walk end-to-end (Dimensions, Photo, Materials, Labour,
> Summary). Phase 1 placeholders are complete; data wiring + real capture come in later phases.

## Quote flow architecture

- The wizard lives in the `(quote)` route group, presented as a **modal Stack** over the tabs.
- Order: **Dimensions → Photo → Materials → Labour → Summary**. "Done" clears the draft and
  returns home via `router.dismissTo('/index')`.
- **Shared state:** `QuoteDraftProvider` (`src/context/quote-draft.tsx`) holds one `QuoteDraft`
  (dimensions, photo flag, selected material IDs, labour). Steps read/write it via `useQuoteDraft()`
  — no param threading, no global store (respects the Phase-1 "no zustand yet" rule). Derived
  values (area, materials/labour/total) are exported helpers alongside it.
- **Shared UI:** `quote-step-screen` (chrome), `step-progress` (the "Step N of 5" bar), `step-footer`
  (Back / primary action). Sample data + USD (`$`) formatting live in `src/constants/quote.ts`.

## Navigation

- Tabs (**Home** + **Explore**) now live under the `(tabs)` group; a root `Stack` hosts both the
  tabs and the `(quote)` flow so the wizard can present over them. URLs unchanged (`/`, `/explore`).
- Still TBD: repurposing the tabs into quote-focused nav (e.g. **Quotes** + **New Quote**) — left
  as-is for now.

## Decisions log

- **2026-06-29:** Photo step built (optional). No real camera/library access in Phase 1 — a tappable
  dashed dropzone plus "Take photo" / "Choose from library" buttons all just set the draft's
  `photoAdded` flag; once added, a placeholder thumbnail tile (✓ "Photo added") shows with a Remove
  action. Layout telegraphs the eventual capture UX so Phase 3 can swap in `expo-image-picker`
  without changing it. Continue stays enabled throughout since the photo is skippable. This
  completes all five Phase-1 flow screens.
- **2026-06-29:** Summary step built — a receipt-style breakdown: job recap (room + floor area),
  the chosen material package's itemized line items (read-only, no buy links) + materials subtotal,
  a `days × rate/day` labour line + labour subtotal, then a headline accent grand total and a
  freshness/disclaimer line. Empty sections degrade gracefully ("No materials selected" / "No labour
  added"). Added a `getSelectedPackage(draft)` helper to `quote-draft.tsx` (rebuilds packages
  deterministically, returns the chosen tier) so Summary can read the package's items/title;
  `getMaterialsTotal` now reuses it. Done still `reset()`s + `dismissTo('/index')`.
- **2026-06-06:** Phase 1 is static placeholders only — no SDK, no TanStack Query, no
  forms libs. Add them in Phase 2 when connecting to Directus.
- **2026-06-06:** No heavy UI kit (NativeBase/Tamagui). Use existing themed primitives to
  avoid locking in styling before seeing the layout.
- **2026-06-27:** Root navigator changed from "tabs as root" to a root `Stack` hosting `(tabs)` +
  `(quote)`. The old structure left non-tab routes (the quote flow) with nowhere to render, so the
  "Start a new quote" button did nothing. Tabs moved into a `(tabs)` group; URLs unchanged.
- **2026-06-27:** Quote-flow state shared via a React Context (`QuoteDraftProvider`) scoped to the
  `(quote)` group — deliberately a built-in context, not `zustand`, to honour the Phase-1 rule.
- **2026-06-27:** Added one `Accent` colour (`#3c87f7`, reusing the existing link blue) for primary
  actions + the step-progress bar, to lift the flow above flat grey without a new palette.
- **2026-06-27:** App launches in the **US** → currency is **USD** (`formatMoney` uses `$`). Labour is
  priced as **days × daily rate** (not hourly).
- **2026-06-27:** Materials step built on **mock data shaped to the eventual server response**
  (`src/constants/materials-mock.ts`): three itemized packages (budget/standard/premium), grounded in
  floor area, with explanations + retailer buy links + a `pricedAt` freshness date. A simulated
  "Get options" round-trip carries the loading UX. Phase 3 swaps the mock for the Directus call —
  the screen won't change. Old metric catalogue (`per m²`/`per litre`) removed; units are now US.
- **2026-06-06:** Installed `node_modules` had drifted to SDK 55 versions while
  `package.json` was pinned to SDK 54. Did a clean reinstall (deleted `node_modules` +
  `package-lock.json`, fresh `npm install`) to realign all runtime packages to SDK 54 so
  the app loads in Expo Go on the maintainer's phone. Confirmed working via
  `exp://<LAN-IP>:8081`. Only remaining mismatch is `@types/react` (dev-only types, no
  runtime impact).

## Status

- [x] Phase 1: placeholder screens built with sample data — all five flow screens (Dimensions, Photo, Materials, Labour, Summary) built and walking end-to-end
- [x] Phase 1: navigation restructured to a root Stack so the quote flow can present over the tabs
