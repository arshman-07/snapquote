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
| New Quote | Form for dimensions + room/job type | ⬜ Not started |
| Photo capture | Take/upload an image of the area (placeholder) | ⬜ Not started |
| Materials | List of materials + prices (sample data) | ⬜ Not started |
| Labour | Input/set labour rate | ⬜ Not started |
| Quote summary | Rough total, broken down (materials + labour) | ⬜ Not started |
| Saved quotes | List of past quotes | ⬜ Later |

## Navigation

- Current scaffold has **Home** + **Explore** tabs.
- Plan: repurpose into quote-focused navigation (e.g. **Quotes** + **New Quote**).
  Exact tab structure TBD once screens are laid out.

## Decisions log

- **2026-06-06:** Phase 1 is static placeholders only — no SDK, no TanStack Query, no
  forms libs. Add them in Phase 2 when connecting to Directus.
- **2026-06-06:** No heavy UI kit (NativeBase/Tamagui). Use existing themed primitives to
  avoid locking in styling before seeing the layout.

## Status

- [ ] Phase 1: placeholder screens built with sample data
- [ ] Phase 1: navigation repurposed for quote flow
