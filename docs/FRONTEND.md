# Frontend — Status

> Living status doc for the SnapQuote frontend. Update as screens and features land.

## Stack

- **Framework:** Expo / React Native (Expo SDK 54)
- **Routing:** Expo Router (file-based, `src/app/`)
- **Styling:** Theme tokens (`src/constants/theme.ts`) + `ThemedText` / `ThemedView` primitives,
  with `StyleSheet.create` per screen. **No NativeWind, no Tailwind, no UI kit** — see the
  2026-07-27 decision below, which closes that long-standing ambiguity.
- **Typeface:** none. The system font (San Francisco on iOS) is used by never setting
  `fontFamily` — the app is deliberately native-iOS in feel rather than custom-branded.
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
| Quote summary | Rough total, broken down (materials + labour) + optional quote name | ✅ Built (Phase 1) |
| Home | Landing: brand header, "Start a new quote" CTA, recent quotes list | ✅ Built (Phase 1, mock recents) |
| Saved quotes | List of past quotes, tap to rename | ✅ Built (Quotes tab) |

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

- Tabs (**Home** + **Quotes**) live under the `(tabs)` group; a root `Stack` hosts both the
  tabs and the `(quote)` flow so the wizard can present over them. URLs: `/` and `/quotes`.
  (Auth: the root Stack now gates `(tabs)`/`(quote)` behind a session — see the auth task doc.)
- The starter **Explore** tab was replaced by a real **Quotes** tab (2026-07-13). Native tab icon
  still reuses the old `explore.png` compass as a placeholder — a list/document icon is TODO.
- Web tab bar rebranded (2026-07-13): "Expo Starter" → **"SnapQuote"** (accent blue), and the
  Expo "Docs" external link removed. Remaining starter branding TODO: `app.json` `name`/`slug` are
  still `"mobile"` (affects the browser tab title + native app label — cross-platform, left for a
  dedicated branding pass), plus the app icon / splash / favicon assets.

## Design system (2026-07-27)

Direction: **native-iOS feel, not a custom visual identity.** System font, iOS spacing and
navigation conventions, platform back gestures. No custom typeface, no UI kit, no gradients,
no drop shadows, **no emoji**.

**Palette** — stone neutrals with near-black actions. Every token has a light *and* a dark
stop defined up front so dark mode never needs retrofitting (`src/constants/theme.ts`).

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#FAFAF9` | `#0C0A09` | page |
| `surface` | `#FFFFFF` | `#1C1917` | inputs, package cards |
| `ink` | `#1C1917` | `#FAFAF9` | primary text **and** primary button fill |
| `body` | `#57534E` | `#A8A29E` | secondary text |
| `muted` | `#A8A29E` | `#78716C` | labels, hints, timestamps |
| `hairline` | `#E7E5E4` | `#292524` | dividers |
| `accent` | `#EA580C` | `#F97316` | **reserved** — see below |
| `onInk` | `#FAFAF9` | `#1C1917` | text on an `ink` fill |
| `danger` | `#B91C1C` | `#F87171` | validation/failure only |

> `ink` is semantic, not literal: it's the primary-emphasis colour, so it inverts in dark mode
> and primary buttons invert with it automatically.

**Accent discipline.** Orange is *not* a primary-action colour — primary actions are `ink`
fills with `onInk` text. The accent is reserved for the **step-progress bar**, the **selected
material tier card**, and **status badges**, with at most one accent element visible per
screen. `danger` is exempt (a validation error must be able to appear anywhere).

**Structural rules** (these are what keep it from looking templated):

- **No card-in-card.** Group with whitespace and alignment, not by wrapping every section in a
  rounded box. Hairline dividers only where separation is genuinely needed.
- Dividers are `StyleSheet.hairlineWidth`, never 1px — use the shared `<Divider />`.
- **Dramatic**, not incremental, type hierarchy: 34 / 28 / 20 / 17 / 13 / 11, each with a
  distinct job and weight. No stack of 17/15/14/13 that all read the same.
- All monetary values render with `tabular` (`fontVariant: ['tabular-nums']`) so figures align.
- Currency is declared **once per section header** (`USD`); line items show bare figures.
  `formatAmount` is the default, `formatMoney` (with `$`) only for standalone figures outside
  such a header — currently just the persisted labour label in `quote-payload.ts`.
- Labels that restate the obvious are dropped — e.g. the Summary grand total has **no "Total"
  label**; it's the largest figure on the screen, alone below a rule after two subtotals.
- Micro-labels: 11px, uppercase, `letterSpacing` 0.9 (~0.08em), `muted`.
- Corner radius: **8** on controls and buttons (`Radius.control`), 12 only for genuinely
  sheet/tile-like surfaces (`Radius.sheet`). Nothing is uniformly large-radius.

**Shared primitives added:** `<Divider />`, and `PrimaryButton` / `SecondaryButton` /
`TextButton` in `src/components/button.tsx` — so button hierarchy is enforced centrally rather
than re-implemented per screen.

## Decisions log

- **2026-07-27:** **Quotes are deletable in-app** — reverses the earlier "no delete" position
  (SECURITY.md). Lives in the quote actions dialog, below a divider with editing, ordered by
  consequence: edit (reversible) above delete (not). Always behind a destructive `Alert` that
  names the quote; there is no trash and no undo.
  - Styled as **text-only in `danger`, not a red fill** — a filled red button competes with
    Save for attention and invites exactly the mis-tap it exists to prevent. Added a
    `tone="danger"` variant to `TextButton` rather than a one-off colour.
  - **`useDeleteQuote` removes line items explicitly, then the quote** — the reverse order from
    the edit flow, and deliberately not relying on a DB cascade. The `quote_items.quote`
    on-delete behaviour isn't readable from the client, and under SET NULL the orphans would be
    invisible to everyone (the read filter scopes through `quote.user_created`) and thus
    impossible to clean up from the app. Deleting them ourselves makes the outcome identical
    either way.
  - `RenameQuoteDialog` became **`QuoteActionsDialog`** — it now does rename, edit and delete,
    so the old name was actively misleading.
- **2026-07-27:** **Saved quotes are fully editable.** Tap a quote → rename dialog → "Edit the
  full quote" → the same five-step wizard, hydrated from the saved row; Done patches in place.
  Renaming stays a one-tap dialog because it's the common case; re-running five steps to fix a
  name would be absurd.
  - **Entry:** `/new-quote?id=123`. `(quote)/_layout.tsx` latches the id (later steps carry no
    params), fetches via `useQuote`, and holds the flow behind a spinner until the draft is
    hydrated — rendering steps first would show an empty form the user could type into just
    before it's replaced.
  - **`draftFromQuote`** in `quote-payload.ts`, next to `buildQuotePayload` so the two
    directions can't drift. Two fields don't round-trip by design: `jobTypeId` (quotes store
    the room type's *name*, not the `room_types` id — the Dimensions step already falls back to
    matching chips by name) and `photoAdded` (never persisted).
  - **`status` moved into the draft** from Summary-local state, so reopening a final quote
    restores the toggle instead of silently resetting it to draft. `buildQuotePayload` lost its
    `status` argument and reads `draft.status`.
  - **`useEditQuote`** patches the row, then replaces line items. **Creates the new items
    before deleting the old** — there's no transaction across the three requests, so a failure
    partway leaves duplicates (a retry cleans those up) rather than a quote with no items
    (nothing recovers that).
  - Required server work: `labour_days` + `labour_day_rate` columns (the labour inputs
    previously survived only inside an item's label string), six missing fields added to the
    `quotes` Update allow-list, `quote_items` Delete, and a fix to `quote_items` Read scoping.
    See BACKEND.md.
- **2026-07-27:** **Quote flow can be exited early.** The `(quote)` group is a modal Stack over
  the tabs, and swiping down only dismisses the topmost screen — so past step 1 there was no
  way back to Home without finishing. Added a close (✕) control to `quote-step-screen`, the
  shared chrome, so all five steps get it. **Discard policy:** an untouched draft closes
  silently; any entered value gets a destructive `Alert` confirm first, because nothing in the
  flow is persisted until Done and closing would otherwise bin it without warning. Dirtiness
  is `isDraftDirty` in `quote-draft.tsx` — a field-by-field compare against the initial draft,
  not a flag, so undoing an edit correctly reads as clean again. Exiting calls
  `reset()` + `router.dismissTo('/')`, identical to what Done already does.
- **2026-07-27:** **Quotes are nameable (`customer_name`) and editable after saving.** Chose
  `customer_name` over `title`/`name`: it says what the field is for, leaves room for a
  separate `title` later, and avoids colliding with the already-overloaded `name` (e.g.
  `room_types.name`). Set in two places — an optional field on the Summary step, and
  tap-to-rename from Home or the Quotes tab. Both were needed: Summary catches it at the
  natural moment, and rename is the only path for the quotes already saved without one.
  - **New update path.** `useSaveQuote` only ever created (`createItem` + `createItems`), so
    `useUpdateQuote` (`src/hooks/use-update-quote.ts`) is the app's first `updateItem` call.
    It takes a partial, so future field edits won't need another hook.
  - **Display fallback:** `quoteLabel()` in `quote-row.tsx` — custom name, else `job_type`,
    else "Quote". When a name is showing, the room type moves down into the metadata line so
    it isn't lost.
  - Extracted `QuoteList` (`src/components/quote-list.tsx`) so Home and the Quotes tab share
    the row treatment and rename flow instead of duplicating it, and `QUOTE_LIST_FIELDS` so
    the two hooks' `fields` arrays can't drift — that exact drift broke the lists on
    2026-07-21.
  - The rename dialog keeps the typed name on failure rather than dismissing, so a flaky
    connection doesn't lose the input.
  - ✅ **Server side landed and verified the same day** — `customer_name` exists on `quotes`
    with App User Read/Create/Update field permissions; all three probed green against the
    live devbox. See `BACKEND.md` for the per-operation allow-list gotcha this surfaced.
- **2026-07-27:** **NativeWind question closed — we stay on theme tokens.** The docs had
  carried an unresolved NativeWind-vs-tokens ambiguity; it was moot. NativeWind was never
  installed (`package.json` has no `nativewind`/`tailwindcss`, and `src/global.css` is only
  four CSS custom properties for web font stacks). Given the native-iOS direction and a token
  system already in place, tokens are the single styling approach. Don't reopen without a
  concrete reason.
- **2026-07-27:** **Full design pass** across every screen, to the direction above. Reworked:
  `theme.ts` (new palette + `Radius`; `Accent`/`backgroundElement`/`backgroundSelected`/
  `textSecondary`/`text` tokens all removed), `ThemedText` (new six-stop scale, per-type
  default colours, `tabular` prop), `ThemedView`, and every screen and shared component.
  Notable changes beyond restyling:
  - Home, Quotes and the Summary breakdown lost their grey card wrappers — rows now sit on the
    page separated by hairlines.
  - Summary is now typography-led: 11px labels against the 34px grand total, bare tabular
    figures, currency declared once.
  - The sign-up form gained a `ScrollView`; at six fields it was overflowing a centred fixed
    view and clipping the bottom on smaller screens.
  - Removed the two emoji (`📷` dropzone, `✓` on the photo tile and selected-package button)
    per the no-emoji rule; hierarchy there is carried by type instead.
  - Fixed a latent bug in `use-theme.ts` / `app-tabs.tsx`: both compared `useColorScheme()`
    against `'unspecified'`, which is not a value it returns (`'light' | 'dark' | null |
    undefined`), so a nullish scheme indexed `Colors` with `null`. Now anything not explicitly
    `'dark'` falls back to light.
  - **Known tension:** the Materials screen shows two accent elements at once — the progress
    bar and the selected tier card — because the progress bar appears on all five flow steps.
    Both are sanctioned uses; if strict one-per-screen is wanted, neutralise the progress bar
    on step 3.
  - **Not addressed** (separate branding pass): app icon, splash, favicon and the Quotes tab
    icon are all still Expo starter assets, and `app.json` `slug`/`scheme` are still `mobile`.

- **2026-07-13:** Replaced the leftover Expo-starter **Explore** tab with a real **Quotes** tab
  (`src/app/(tabs)/quotes.tsx`) — the full saved-quote history, newest first (Home still shows only
  the 5 newest). The quote row (job type + area/date + total + Draft tag) was extracted from Home
  into a shared `src/components/quote-row.tsx` (`QuoteRow` + `formatDate`), now used by both
  screens. New `useAllQuotes` hook keyed `['quotes', 'all']` (a child of `['quotes']`, so
  `useSaveQuote`'s invalidation refreshes it too), limit 100. Deleted `explore.tsx`; renamed the
  tab (native + web). Not touched: the web tab bar's "Expo Starter" brand text + "Docs" link
  (branding pass deferred). Verified on web behind the auth gate against live data.

- **2026-07-01:** Home tab rebuilt from the Expo starter into a real landing screen — a
  "SnapQuote" brand header + tagline, a full-width accent "Start a new quote" CTA (keeps the
  `/new-quote` entry point), and a "Recent quotes" list. The list is static Phase-1 mock data
  (`src/constants/recent-quotes-mock.ts`, shaped to the eventual Directus response: id/jobType/
  area/unit/total/dateISO) rendered as hairline-separated rows (job type + area/date left, accent
  total right), reusing `formatMoney`. Includes an empty-state fallback (unused while seeded).
  Dropped the starter scaffolding (animated icon, dev-tool `HintRow`s, `WebBadge`) — those
  components stay (still used by Explore). Screen is a `ScrollView` so the list grows gracefully.
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
- [x] Auth: login, sign-up (with profile), gate, logout, session expiry → login (2026-07-13 → 07-27)
- [x] **Design system pass across every screen** (2026-07-27) — see the section above
- [x] **Quotes are nameable, editable and deletable** (2026-07-27)
- [x] Quote flow can be exited early with a discard confirm (2026-07-27)

### ⚠️ Verification state (2026-07-27)

Everything dated 2026-07-27 — the whole design pass, `customer_name`, quote editing,
quote deletion, and the flow-exit control — is **verified by typecheck, lint, web
bundle, and direct API probing only. None of it has been run on a device or in a
browser.** A clean `expo export` proves no import or top-level render crash across all
20 routes; it says nothing about layout, touch targets, keyboard behaviour, or whether
any of it looks right.

Highest-risk untested areas, in order:

1. **Edit-flow hydration** (`(quote)/_layout.tsx`) — latches the quote id from
   `useGlobalSearchParams` because later steps carry no params. Reasoned through, never
   run. If wrong, "Edit the full quote" shows a blank wizard or spins forever.
2. **`QuoteActionsDialog`** — `Modal` + `autoFocus` + `KeyboardAvoidingView` is fiddly on
   iOS; the keyboard may cover the buttons.
3. **The close ✕ control** — positioned with negative margins to sit inside the header
   padding; easy to get wrong against a real safe-area inset.
4. **The visual design pass as a whole** — never seen rendered.

Suggested smoke test: create a quote end-to-end; tap a saved quote → edit → change a
dimension → Save changes; tap → delete. That exercises everything above.

### Known open UI items

- **Materials shows two accent elements at once** (progress bar + selected tier card) —
  both are sanctioned uses, but it breaks the one-per-screen rule. Undecided: neutralise
  the progress bar on step 3, or accept it.
- **App identity is still Expo's** — icon, splash, favicon, the Quotes tab icon, and
  `app.json` `slug`/`scheme` (`"mobile"`). A branding pass was explicitly deferred.
- **Sign-out button overlaps the web tab bar** (web only; fine on native).
- Offline fallbacks behind the auth gate are untested (OPEN-QUESTIONS #7).
