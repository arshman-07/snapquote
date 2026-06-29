# Task: Photo Estimation

## Goal

Let the user snap/upload a photo of the area needing construction; AI uses the image to
refine or add to the estimate.

## Scope

- Capture or upload an image of the work area.
- Send image to the server-side AI step to refine the material/quote estimate.
- Image runs through Directus / companion service — never AI-from-frontend.

## Phase 1 (placeholders)

- [x] Photo capture screen with a placeholder image area + "take/upload" buttons (no-op).
- [x] No real camera/AI yet.

> Built 2026-06-29 (`src/app/(quote)/photo.tsx`). Optional step: a tappable dashed dropzone plus
> "Take photo" / "Choose from library" buttons that all set the draft's `photoAdded` flag (no real
> capture yet). Once added, a placeholder thumbnail tile (✓ "Photo added") shows with a Remove
> action. Continue stays enabled since the photo is skippable. Layout telegraphs the eventual
> capture UX so Phase 3 can swap in `expo-image-picker` without changing it.

## Later

- [ ] `expo-image-picker` (+ `expo-camera` for live capture).
- [ ] Upload image to Directus file storage.
- [ ] Feed image into AI estimation (see [ai-material-estimation](./ai-material-estimation.md)).

## Open questions

- Is the photo a refinement of the dimension-based estimate, or an alternative entry path?
- What does the AI actually extract from the image (surface area? condition? material type?)?

## Status

- [x] Phase 1: placeholder capture screen built (2026-06-29)
- [ ] Later: real capture (`expo-image-picker`/`expo-camera`), upload to Directus, feed into AI
