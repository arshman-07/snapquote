# Frontend — Status

> Living status doc for the SnapQuote frontend. Update as screens and features land.

## Stack

- **Framework:** Expo / React Native (**Expo SDK 57**, since 2026-09-18 — see AGENTS.md)
- **Routing:** Expo Router (file-based, `src/app/`)
- **Styling:** Theme tokens (`src/constants/theme.ts`) + `ThemedText` / `ThemedView` primitives,
  with `StyleSheet.create` per screen. **No NativeWind, no Tailwind, no UI kit** — see the
  2026-07-27 decision below, which closes that long-standing ambiguity.
- **Typeface:** Inter + JetBrains Mono via `@expo-google-fonts` (2026-09-18) — see the
  Industrial Skeuomorphism design system below.
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
- **Keyboard:** `quote-step-screen` provides `KeyboardRevealContext`
  (`src/components/keyboard-reveal.tsx`) — any `DataInput` on a step scrolls itself clear of the
  keyboard when focused. Chain fields with `ref` + `onNext` (Dimensions: Length → Width →
  Height). See the 2026-09-18 keyboard entry in the Decisions log.

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

## Design system — Industrial Skeuomorphism (2026-09-18)

Direction: **the app is a physical device.** A matte plastic chassis (the page), panels bolted
onto it, keys that depress, data slots recessed into the surface, LEDs for status. Replaces the
2026-07-27 "native-iOS, no shadows" system. Tokens live in `src/constants/theme.ts`.

**Migration plan** — one section at a time, each approved and phone-tested before the next:

1. ✅ **Foundation** (tokens, fonts, shared primitives) — 2026-09-18
2. ✅ **Login + sign-up** — 2026-09-18
3. ✅ **Home + Quotes tabs, quote rows, actions dialog, native tab bar recolour** — 2026-09-18
4. ✅ **Quote wizard chrome (pipe progress, close key) + all five steps** — 2026-09-18
5. ✅ **Splash colours, legacy token removal, final doc pass** — 2026-09-18

Sections 4–5 are static-check verified only — see Verification state.

**Light physics.** One light source, **top-left at 45°**: highlights on top/left edges, shadows
bottom/right. Every depth effect is a `boxShadow` string (native on the New Architecture):

| Token (`useShadows()`) | Level | Use |
|---|---|---|
| `recessed` | −1 | inputs, screens, wells |
| `pressed` | −1 | a key while held / latched |
| `card` | +1 | `<Panel>` |
| `key` | +1 | compact keys (chips, stepper) |
| `floating` | +2 | the dominant panel, dialogs |
| `accentKey` / `accentPressed` | +1 / −1 | the red primary key |
| `dimple` | — | screw heads, vent slots, unlit LEDs |

**Palette** — light is canonical workshop grey; dark is a charcoal panel lit by the same rules.

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#E0E5EC` | `#2B3036` | chassis — the page and every panel/key face |
| `recessed` | `#D1D9E6` | `#23272C` | sunken wells |
| `ink` | `#2D3436` | `#E0E5EC` | primary text |
| `body` | `#4A5568` | `#A8B2D1` | secondary text |
| `muted` | `#566173` | `#939DB0` | labels, placeholders (AA on chassis) |
| `hairline` / `groove` / `highlight` | | | outlines; the two lips of a `<Divider>` groove |
| `accent` | `#FF4757` | `#FF4757` | safety orange — primary key, active LED, progress, selection |
| `onAccent` | `#FFFFFF` | `#FFFFFF` | text on the accent key |
| `danger` | `#B0302A` | `#FF7A70` | errors — deliberately not the accent red |
| `success` / `warning` | green / amber | same | LEDs only |

**Accent discipline (changed).** The accent *is* now the primary-action colour — the one key to
press. It stays reserved for interaction and status: never decorative, never body text.

**Typography.** Inter (400/600/700/800) for reading, JetBrains Mono (500/700) for data and
stamped labels, loaded with `useFonts` in the root layout (render is held until they're in).
Custom fonts are one family per weight, so **never set `fontWeight` next to a `fontFamily`** —
`ThemedText` translates any `fontWeight` into the right family via `fontFor()`.

- Scale: `display` 34 · `title` 28 (800, tight, embossed) · `heading` 20 · `body` 17 ·
  `caption` 13 · `label` 11 (mono, uppercase, tracked) · `button` 15 (uppercase).
- `tabular` now means **mono**: every monetary value / figure renders in JetBrains Mono.
- Inputs are mono too (`DataInput`), like a terminal readout.

**Shared primitives** (`src/components/`):

- `Key` (`button.tsx`) — the physical key every pressable is built on. `chassis` / `accent` /
  `ghost` variants; press = 2pt travel + shadow flip over a sprung 150ms curve (Reanimated CSS
  transitions) + a light haptic (`lib/haptics.ts`). `latched` holds it down — use for chips,
  toggles, segments. `PrimaryButton` / `SecondaryButton` / `TextButton` wrap it, same props as before.
- `Panel` (`panel.tsx`) — bolted module: chassis fill, `card` shadow (`elevated` → `floating`),
  corner `Screw`s 12pt from each edge (on by default), optional `Vents`.
- `DataInput` (`data-input.tsx`) — recessed mono well, 56pt min height, accent focus
  "backlight" ring, `danger` ring on error, optional `suffix`, `multiline`. Takes `ref` (to
  focus it) and `onNext` (keyboard "Next" → next field; on iOS number pads, which have no return
  key, an accessory bar with Next / Done). Scrolls itself into view inside a
  `KeyboardRevealContext` provider.
- `Field` (`field.tsx`, was `auth-field.tsx`/`AuthField`) — stamped label + `DataInput` + error,
  with an optional `suffix` unit string. Every form field in the app uses it.
- `Chip` (`chip.tsx`) — pick-one option: a latching `Key` with an indicator LED (always
  present, lit when selected, so widths never jump). Room types, units, labour rates, and the
  sign-up account type.
- `StepProgress` — a recessed pipe filled with accent up to the current step, one LED node per
  step (current one pulses), plus the "Step N of 5 · Name" legend.
- Corner radius scale: `Radius.sm/md/lg/xl/full` only (the `control`/`sheet` aliases are gone).
- `Led` (`led.tsx`) — status light with mono legend; `accent` / `success` / `warning` / `off`,
  optional `pulse`. Always labelled, so status is never colour-only.
- `Divider` — now a machined groove (dark upper lip, lit lower lip), not a hairline.
- `Readout` / `ReadoutText` (`readout.tsx`) — a backlit "device screen": dark glass in a
  recessed bezel with CRT scanlines. Fixed `ScreenColors` (a lit screen looks the same in
  light and dark mode). At most one per screen.
- `QuoteListPanel` (`quote-list.tsx`) — the saved-quotes list on a panel with its header and
  loading / error / empty states; shared by Home and the Quotes tab.

**Carried over:** no card-in-card; currency declared once per section header (`USD`) with bare
figures below; labels that restate the obvious are dropped; ≥48pt touch targets.
**Adapted for mobile:** hover states become press states; the spec's external texture images
(carbon fibre, noise) are left out — a phone app shouldn't depend on a third-party URL.
Icons: `lucide-react-native` (installed, first used in section 3/4).

## Decisions log

- **2026-09-18:** **Redesign to Industrial Skeuomorphism — section 1 (foundation).** Maintainer
  decisions: build on SDK 57; **keep a dark variant** (charcoal panel) rather than going
  light-only as the spec says; add `expo-haptics`, `lucide-react-native` (+ `react-native-svg`),
  `@expo-google-fonts/inter` + `/jetbrains-mono`; **keep the native tab bar** and only recolour it.
  - Shadows are plain `boxShadow` strings, not a shadow library — RN 0.86 renders layered and
    inset shadows natively.
  - Fonts are imported per weight (`@expo-google-fonts/inter/700Bold`), not from the package
    root, which would bundle all 18 weights. 6 files ship.
  - `src/global.css` deleted — it only fed the old web `Fonts` map.
  - Navigation theme is painted in chassis colours so transitions don't flash white.
- **2026-09-18:** **Redesign section 2 — login + sign-up.** Both screens: `Nameplate` (power LED
  + stamped brand) → embossed title on the chassis → the form as one screwed/vented `Panel`
  ending in the red key → `AuthSwitchLink` (shared in `components/auth-chrome.tsx`).
  - The power LED deliberately isn't labelled "online" — we can't know that before a request.
  - Offline notice is now its own panel with a pulsing amber **OFFLINE** LED (still not an
    error style). Retry logic untouched.
  - Contractor/Homeowner is a pair of latching `Key`s with an indicator LED each; selection is
    also exposed as `accessibilityState.selected`, so it's never colour-only.
  - Switch link is ink + bold + underlined, not accent: `#FF4757` fails contrast as 13pt text.
  - **Login now scrolls** (was a fixed centred view) — the panel made it tall enough to clip
    on short phones with the keyboard up. Still centred when there's room.
- **2026-09-18:** **Redesign section 3 — Home, Quotes, dialog, tab bar.**
  - Home: nameplate strip (power LED + ghost Sign-out key) → headline → an elevated, vented
    "control module" panel holding a `Readout` of the **latest quote** (`formatMoney`, since no
    USD header sits above it) and the red Start key → `QuoteListPanel`.
  - Quote rows are ghost `Key`s (sink into a well + haptic when pressed) with a lucide chevron;
    drafts carry an amber **DRAFT** LED instead of a bare label. Totals render in mono.
  - Loading/error/empty handling for both lists moved into `QuoteListPanel`. Behaviour change:
    the Quotes tab now shows its "All quotes" header in every state (was: only with rows).
  - `QuoteActionsDialog`: elevated `Panel` over a charcoal scrim, name field is a `DataInput`.
    Logic untouched.
  - Native tab bar tinted only (still `NativeTabs`): chassis background, accent icon when
    selected, Inter labels. Now reads colours via `useTheme()` instead of its own lookup.
- **2026-09-18:** **Redesign section 4 — the quote wizard.** Maintainer asked for sections 4
  and 5 back-to-back with one device test at the end. **Sections 4–5 and the keyboard
  Next-field fix passed the maintainer's on-device test (reported 2026-10-08).**
  - Chrome: pipe `StepProgress`; the ✕ glyph is now a round chassis `Key` with a lucide `X`
    (and no longer uses negative margins against the safe area).
  - Dimensions: `Chip`s for room type and units; length/width/height are `Field`s on a
    `Panel`; floor area lights up on a `Readout` inside that panel.
  - Photo: the dashed dropzone is a tappable viewfinder `Readout` (whole screen is a ghost
    key); "added" shows a green LED on the glass. **Copy change:** "Choose from library" →
    "Library" — the uppercase legend wrapped at half width.
  - Materials: brief/ZIP are `Field`s (brief multiline); packages are hanging price-tag
    panels (punched hole, no screws); selected = accent backlight ring + lit **SELECTED** LED;
    buy links get a lucide external-link glyph.
  - Labour: round −/+ keys either side of a recessed counter window; rate `Chip`s; custom rate
    `Field` (`/ day` suffix); total on a `Readout` with its own `$` (standalone figure).
  - Summary: receipt = one vented panel with groove dividers; grand total on a `Readout`
    legend "Estimate · USD"; "Mark as final" switch now tracks accent (a toggle is
    interactive) with an amber/green LED stating what will be saved.
  - **The one-accent-per-screen rule is retired** — under this system the accent marks every
    interactive/active thing (primary key, lit LEDs, progress, selection). The old
    "Materials shows two accents" open item is therefore closed.
- **2026-09-18:** **Keyboard: Next-field chaining + auto-scroll in the wizard** (maintainer
  report: the keyboard covered Width/Height on Dimensions).
  - `react-native-keyboard-controller` was the obvious tool but **is not in Expo Go**, so this
    is core RN only. `DataInput` takes `ref` + `onNext`: Android's action key becomes "Next";
    iOS number pads (which have no return key) get an `InputAccessoryView` bar with
    **Next** / **Done** keys. Every iOS numeric field now gets that bar (Done), so decimal
    pads can finally be dismissed.
  - `QuoteStepScreen` provides `KeyboardRevealContext`: a focused field is scrolled to ~88pt
    below the top, and the content gets keyboard-height bottom padding so the last fields can
    get there. `keyboardDismissMode="interactive"` added. Applies to every wizard step.
  - Dimensions chains Length → Width → Height (Done).
- **2026-09-18:** **Redesign section 5 — cleanup.** Launch overlay and native splash now use
  the chassis colour (`app.json` gets a `dark` splash background); tokens nothing uses any
  more removed (`surface`, `onInk`, `Radius.control`/`sheet`) along with the unused
  `ButtonRow`; `AuthField` renamed `Field`; web top bar gets the LED nameplate. Splash
  *image* and app icon are still Expo's — branding remains deferred.

- **2026-09-18:** **Upgraded SDK 54 → 57, and migrated off react-navigation rather than
  suppressing the check.** Not a chosen upgrade — Expo Go auto-updated itself on the
  maintainer's phone, which is the only test device, so the project had to follow the same
  day. `npx expo install expo@^57` + `--fix` took RN 0.81→0.86, React 19.1→19.2,
  TypeScript 5.9→6.0 and expo-router 6→57.
  - **The breaking change is narrower than it first looks.** SDK 56 dropped expo-router's
    `@react-navigation/*` dependencies for a native implementation, and app code may no
    longer import from them — but *the runtime API is unchanged*. `Stack`,
    `Stack.Protected`, `NativeTabs` and the rest needed no changes at all. Exactly one app
    import broke: the themes in `src/app/_layout.tsx`.
  - Migrated to the **`expo-router` root export**, not the `expo-router/react-navigation`
    compat entry the migration guide's table points at — the compat entry has all three
    symbols but marks each `@deprecated`, for removal in a future SDK.
  - `@react-navigation/native`, `/bottom-tabs` and `/elements` removed from
    `package.json`. Nothing outside the react-navigation cluster depended on them.
  - `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` deliberately **not** used. All three
    platforms bundle clean without it.
  - Unrelated fallout from RN 0.86: `StyleSheet.absoluteFillObject` is gone from both the
    types and the runtime. `absoluteFill` is now that plain object, so the spread in
    `animated-icon.tsx` swapped one-for-one.
  - **The 6 pre-existing `app-tabs.tsx` typecheck errors are fixed by the upgrade** — the
    `expo-router@57` types have `NativeTabs.Trigger.Label`/`.Icon`. Typecheck is at zero
    for the first time since 2026-08-16, so it is a usable green light again.

- **2026-09-18:** **Cleared the 13 new React Compiler lint errors instead of relaxing the
  rules.** `eslint-config-expo@57` ships `eslint-plugin-react-hooks@7`, whose
  compiler-aware rules didn't exist under the old config. Notably these were not noise —
  10 of the 13 landed on `(quote)/_layout.tsx`, the edit-flow id latch this doc already
  flagged as the riskiest never-run code, and `reactCompiler: true` is on.
  - `(quote)/_layout.tsx` — `editIdRef` → state set during render behind an
    `editId === null` guard. Kept the original "latch the id the **first time it is
    seen**, on whichever render that happens" semantics; a `useState` lazy initializer
    would only read the first render and would silently break edit if the param arrives
    later.
  - `quote-actions-dialog.tsx` — re-seed effect → adjust-state-during-render. Also fixes a
    real one-frame bug: the effect committed the *previous* quote's name and corrected it
    on a second pass. Narrowed to the closed→open transition, so a mid-edit `initialName`
    change can no longer clobber the user's typing.
  - `use-color-scheme.web.ts` — hydration flag → `useSyncExternalStore` (`false` server
    snapshot, `true` client), which is what React provides for this static-render split.
  - `auth.tsx` — the only change made purely to satisfy the linter. Every `setStatus` in
    `restoreSession` already happens after an `await`; the rule can't see through the
    call. Probing the rule showed `void f()` and `f().catch()` are both flagged while
    `void (async () => { await f(); })()` passes. Behaviour identical.
  - `new-quote.tsx` — five `watch()` reads → one `useWatch({ control, name: [...] })`.
    `watch()` reads RHF's mutable store during render, which made the compiler skip
    optimising the whole screen.

- **2026-08-16:** **A cold launch with no server explains itself instead of demanding a
  password** (OPEN-QUESTIONS #7). The four offline fallbacks below the gate were fine; the
  gate above them wasn't. `directus.refresh()` failing on launch gated to `signedOut`, which
  dropped the user on a login form that cannot succeed while the server is unreachable — so
  the fallbacks were unreachable from a cold start, the one case they were written for.
  - `auth.tsx` now records **why** restore failed, not just that it did: `offlineSession` is
    true only for a network failure with a refresh token still on the device. A server
    rejection leaves it false — that user really is signed out. The gate logic is unchanged.
  - The login screen shows a **"You're offline"** card in that state, with a **Try again**
    that re-runs the restore. A stored refresh token is a working credential; making someone
    type a password to use a token we already hold is busywork. `restoreSession` returns
    whether the session came back so a still-failing retry can say so rather than looking
    inert.
  - Styled as a neutral `surface` card, **not** an error — nothing has gone wrong. Retry is a
    `SecondaryButton` so "Sign in" stays the screen's single filled action.
  - The unmount guard moved from a per-effect `cancelled` local to a `mountedRef`, since
    restore is now callable twice (launch + retry). Reset on mount so a Fast Refresh remount
    doesn't leave it stuck false.
  - **Confirmed on-device:** the Directus SDK leaves the refresh token in SecureStore after a
    failed refresh. The whole feature depended on that and it wasn't knowable from the code.
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
- [x] **Offline cold launch explains itself on the login screen** (2026-08-16, device-verified)
- [x] **Expo SDK 54 → 57**, migrated off react-navigation (2026-09-18, static checks only)
- [x] **Lint and typecheck both clean** under the SDK 57 React Compiler rules (2026-09-18)
- [x] **Industrial Skeuomorphism redesign** — all 5 sections built 2026-09-18 (typecheck,
  lint, iOS + Android + web `expo export` clean). Sections 1–3 device-verified; **4–5 not yet**

### Verification state (updated 2026-09-18)

**Device-verified 2026-09-18.** The maintainer ran the full smoke test on the phone after
the SDK 57 migration and redesign sections 1–3 and reported everything working. Recorded as
a pass over the list below rather than a step-by-step log — the granularity of the
2026-08-16 entry below is not claimed here:

- **Edit-flow hydration** — tap a saved quote → Edit the full quote → change a dimension →
  Save changes. This closes the longest-standing gap in this doc: the latch had been
  written (2026-07-27) and rewritten (2026-09-18, ref → state-during-render) without ever
  being executed. It works.
- **Delete** a quote from the actions dialog, and **exit a wizard part-way via the close ✕**.
- **`QuoteActionsDialog`** on a real keyboard, and the **Quotes tab**, both opened for the
  first time.
- **The SDK 57 navigation swap** — gate, tabs, and `/new-quote` presenting as a modal over
  the tabs — behaves as it did on SDK 54. expo-router's move off react-navigation is
  invisible at runtime, as the migration guide said it would be.
- **Redesign sections 1–3** (foundation, auth screens, Home/Quotes tabs + rows + dialog +
  tab tint) seen on a device for the first time.


**Previously device-verified 2026-08-16** (14-step run with Directus stopped and restarted on the
devbox — not airplane mode, which prevents a dev build from fetching its bundle at all):

- The offline notice, its Try-again while still offline, and Try-again after reconnecting
  signing straight in without a password.
- Sign-out → plain login form with no notice, including after a relaunch with the server
  down (a cleared token is a signed-out user, not an offline one).
- Wrong-password error unchanged.
- The **new-quote wizard end to end** — Dimensions → Labour → Summary → Done → save — with
  both offline fallbacks showing and the save-failure alert retrying successfully once the
  server came back. This is the first time the 2026-07-27 design pass has been seen
  rendered on a device.
- Home's error note and pull-to-refresh.

**Cleared 2026-09-18.** The four items carried here since 2026-07-27 — edit-flow
hydration, `QuoteActionsDialog` on a real keyboard, the close ✕ against a real safe-area
inset, and the Quotes tab — have all now been exercised on a device. Nothing from that
list is outstanding.

**Still unverified:** redesign **section 4** (quote wizard chrome + the five steps) and
**section 5** (splash colours, token cleanup) — built after the smoke test above, typecheck /
lint / 3-platform `expo export` only. Web has not been re-checked in a browser since the redesign began (static export renders).

### Redesign — device checks still owed (2026-09-18)

For sections 4–5: walk the whole wizard (Dimensions → Photo → Materials → Labour → Summary →
Done), in light and dark mode. Most likely to need tuning on a real phone:
shadow strength/blur (especially **dark mode** and Android), custom fonts in the **native tab
bar** labels, the `Key` press transition (Reanimated CSS `boxShadow` interpolation — if it
doesn't interpolate it will simply snap, which is acceptable), `adjustsFontSizeToFit` on
readout figures.

**Keyboard fix (2026-09-18, after the maintainer reported the keyboard covering Width/Height)
— owed on both platforms:**

1. Dimensions: tap Length, type, press **Next** → Width slides up above the keyboard → Next →
   Height → **Done** closes it. On iOS the Next/Done keys are the bar above the number pad;
   on Android they're the keyboard's own action key.
2. Materials brief / ZIP, Labour custom rate, Summary name — each scrolls clear when tapped;
   iOS ZIP and rate show the Done bar.
3. Drag the page down with the keyboard up — it should follow and close.

Watch for: the reveal landing too high/low (tune `REVEAL_OFFSET` in `quote-step-screen.tsx`),
and whether Android (edge-to-edge, SDK 57) *also* resizes the window — if so there will be
double the empty space below the footer while typing (harmless, but drop the padding on
Android if it looks wrong).

### Known open UI items

- ~~**Materials shows two accent elements at once**~~ — moot: the redesign retired the
  one-accent-per-screen rule (2026-09-18).
- **App identity is still Expo's** — icon, splash, favicon, the Quotes tab icon, and
  `app.json` `slug`/`scheme` (`"mobile"`). A branding pass was explicitly deferred.
- **Sign-out button overlaps the web tab bar** (web only; fine on native). Not re-checked
  since the Home redesign moved Sign out into the nameplate row.
- ~~**`npx tsc --noEmit` fails with 6 errors in `src/components/app-tabs.tsx`**~~
  **Fixed by the SDK 57 upgrade (2026-09-18).** The errors were a types/API-shape mismatch:
  `NativeTabs.Trigger.Label`/`.Icon` didn't exist on `expo-router@6.0.24`'s types, which
  exposed only `.TabBar` on `Trigger`. The `expo-router@57` types have them. Typecheck is
  clean again and can be used as a green light.
