# Future features — backlog

Ideas we want eventually but aren't building yet. These wait until the core
groundwork (Phase 2 wiring, Phase 3 AI estimation) is solid. Nothing here is
scheduled or decided — capture only. Move an item into `docs/tasks/` when it's
ready to be worked.

---

## Job-type components (selectable scopes per job type)

**Idea:** each job type exposes a checklist of the things that can be part of
that job, so the client can pick exactly what's in scope. Each selected
component becomes an input to the AI material estimation (Phase 3) and a line on
the quote. Example the user gave: a Kitchen offers countertop, under-counter
cabinets, over-counter cabinets, oven, and oven vent.

This builds directly on the `jobTypeId` now captured on the draft — components
hang off the room-type id, so the two features compose cleanly.

### Recommended components per current job type

**Kitchen**
- Countertops
- Under-counter cabinets
- Over-counter (wall) cabinets
- Oven / range
- Oven vent (range hood)
- Sink & faucet
- Backsplash
- Kitchen island
- Dishwasher
- Flooring
- Lighting
- Plumbing rough-in
- Electrical

**Bathroom**
- Vanity & countertop
- Sink & faucet
- Toilet
- Bathtub
- Shower / enclosure
- Wall & floor tiling
- Mirror / medicine cabinet
- Exhaust fan
- Lighting
- Plumbing rough-in

**Bedroom**
- Flooring
- Closet / wardrobe (incl. built-ins)
- Wall & ceiling painting
- Lighting / ceiling fan
- Windows
- Trim & baseboards

**Living Room**
- Flooring
- Wall & ceiling painting
- Feature wall / fireplace
- Built-in shelving / media unit
- Lighting
- Windows
- Trim / crown molding

### Surface jobs — own config panel (not a checklist)

Flooring and Painting are single-scope jobs: there's really one component (the
whole job) with spec choices rather than a list of parts to tick. These should
render their own config panel instead of the room checklist.

**Flooring** — spec choices
- Flooring material (hardwood / laminate / vinyl / tile / carpet)
- Old-floor removal & disposal
- Subfloor prep / leveling
- Underlayment
- Baseboards / trim
- Transition strips

**Painting** — spec choices
- Surface prep (patch / sand)
- Primer
- Wall paint
- Ceiling paint
- Trim & door paint
- Interior vs. exterior
- Number of coats

### Notes for when we pick this up
- **Storage:** undecided. Natural fit is a configurable Directus collection
  (e.g. `room_type_components`, M2O → `room_types`, with `name` / `sort` /
  `default_selected`), mirroring how `room_types` works today — but we could
  prototype the UI against a static constant first. Decide when it's scheduled.
- **Quote capture:** selected components need to be saved with the quote — either
  a `quote_components` join or by reusing `quote_items`.
- **UI split:** room job types → component checklist; surface jobs (Flooring,
  Painting) → dedicated config panel (decided above).
- The component lists above are a starting recommendation, not a locked launch
  list — expect product to trim/add.
