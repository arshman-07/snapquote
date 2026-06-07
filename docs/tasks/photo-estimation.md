# Task: Photo Estimation

## Goal

Let the user snap/upload a photo of the area needing construction; AI uses the image to
refine or add to the estimate.

## Scope

- Capture or upload an image of the work area.
- Send image to the server-side AI step to refine the material/quote estimate.
- Image runs through Directus / companion service — never AI-from-frontend.

## Phase 1 (placeholders)

- [ ] Photo capture screen with a placeholder image area + "take/upload" buttons (no-op).
- [ ] No real camera/AI yet.

## Later

- [ ] `expo-image-picker` (+ `expo-camera` for live capture).
- [ ] Upload image to Directus file storage.
- [ ] Feed image into AI estimation (see [ai-material-estimation](./ai-material-estimation.md)).

## Open questions

- Is the photo a refinement of the dimension-based estimate, or an alternative entry path?
- What does the AI actually extract from the image (surface area? condition? material type?)?

## Status

- [ ] Not started
