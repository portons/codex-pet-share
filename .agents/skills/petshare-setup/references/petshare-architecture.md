# Petshare Architecture Reference

Use this reference when changing app behavior, provider adapters, uploads,
previews, animations, playground rooms, or deployment. Keep provider-specific
logic behind adapter folders and keep feature code under `src/` provider-neutral.

## Stack And Provider Boundary

The shipped stack is React 19, Vite 7, TypeScript, plain CSS, Three.js,
Cloudflare Workers, D1, R2, and Durable Objects. There is no global state
library and no design system framework.

The frontend expects an HTTP API under `VITE_APP_API_BASE_URL` and a realtime
endpoint under `VITE_REALTIME_URL`. To make a new provider:

1. Keep public env names generic. Do not add `VITE_SUPABASE_*`,
   `VITE_CLOUDFLARE_*`, or equivalent public provider names unless explicitly
   requested.
2. Implement the API groups in `docs/PROVIDER_ADAPTERS.md`.
3. Implement the room-channel interface exported through
   `src/realtime/roomChannel.ts`.
4. Put provider-specific code in `adapters/<provider>/` and
   `src/realtime/adapters/<provider>*.ts`.
5. Switch the `current*` realtime barrels only after the new adapter matches the
   existing room contract.

The checked-in Cloudflare adapter uses:

- Worker Assets for `dist/`
- D1 for users, sessions, pets, likes, collections, and room metadata
- R2 for `pet.json`, `spritesheet.webp`, `share.png`, `preview.webp`, and
  `poster.webp`
- Durable Objects for authenticated room presence and broadcasts
- Wrangler secrets for `AUTH_SECRET` and `PET_STATS_SALT`

## Pet Package And Upload Contract

Canonical uploaded package inputs:

- `pet.json`
- `spritesheet.webp`

The manifest schema is:

```json
{
  "id": "pet-slug",
  "displayName": "Pet Name",
  "description": "Short description.",
  "spritesheetPath": "spritesheet.webp",
  "spriteVersionNumber": 2,
  "kind": "object"
}
```

`kind` must be one of `object`, `animal`, `person`, or `creature`. The frontend
normalizes the manifest id into a lowercase hyphen slug before upload. The
backend enforces a nonempty slug, `displayName` up to 80 chars, `description` up
to 280 chars, and `spritesheetPath: "spritesheet.webp"`. The
`spriteVersionNumber` field is omitted for v1 and must be exactly `2` for v2.

Spritesheet contract:

- V1 atlas: `1536x1872`, 8 columns x 9 rows, no manifest version field
- V2 atlas: `1536x2288`, 8 columns x 11 rows, `spriteVersionNumber: 2`
- Cell size: `192x208`
- File type: WebP

V2 preserves rows 0-8, uses row 0 / column 6 as the dedicated neutral look
cell, and adds rows 9-10 for 16 clockwise look directions in 22.5-degree steps.
A provider must reject a v2-height sheet without the marker and a v1-height
sheet with the marker.

Upload flow:

1. `src/uploads/UploadPages.tsx` collects `pet.json`, `spritesheet.webp`, kind,
   and tags.
2. `src/uploads/UploadValidationPreview.tsx` previews manifest parse state,
   normalized id, atlas size, and cell size before submit.
3. `src/uploads/uploadAssets.ts` generates:
   - `share.png`: 1200x630 PNG for social cards
   - `preview.webp`: one 96x104 frame for every supported cell; `5472x104` for
     v1 and `7008x104` for v2
   - `poster.webp`: 192x208 WebP from the first idle cell
4. `src/uploads/useUploadWorkflow.ts` posts multipart form fields
   `manifest`, `spritesheet`, `shareImage`, `previewImage`, `posterImage`,
   `kind`, and `tags` to `POST /api/pets`.
5. The backend validates all files, stores the five assets, records a validation
   report, refreshes app data, and navigates to the new pet detail route.

The download package endpoint returns only `pet.json` and `spritesheet.webp` in
`<pet-id>.codex-pet.zip`; generated preview/social assets are app artifacts, not
part of the Codex pet package.

## Preview Surfaces

There are three preview layers:

- `PetSprite`: CSS background animation from the full spritesheet for one state.
- `CyclingPetPreview`: CSS animation from generated `preview.webp`.
- `GalleryPetPreview`: deterministic state pick from `pet.id`, so gallery cards
  vary without random visual churn.

Cursor preview is separate:

- Enabled only on hover/fine-pointer devices.
- Preloads `spritesheetUrl`.
- V1 uses `idle`, `waiting`, `running-left`, and `running-right`.
- V2 maps pointer motion to the 16 cells in rows 9-10 and falls back to idle in
  the pointer deadzone.
- Clamps to viewport edges and tilts based on horizontal pointer speed.

GIF export is generated on demand from the canonical API spritesheet route:

- `GET /api/pets/:id/spritesheet`
- `gifenc` encodes one selected animation row. V2 "all GIFs" exports the two
  look-direction rows alongside the original nine states.
- Output uses source cell size `192x208`.
- Alpha below `gifAlphaThreshold` (`200`) is snapped transparent.

## Animation Atlas

Frontend config lives in `src/domain/config.ts`; playground config lives in
`src/playground/core/config.ts`. Keep them aligned when changing atlas shape or
state rows.

| State | Row | Frames | Playground FPS | Loop |
|---|---:|---:|---:|---|
| `idle` | 0 | 6 | 6 | yes |
| `running-right` | 1 | 8 | 12 | yes |
| `running-left` | 2 | 8 | 12 | yes |
| `waving` | 3 | 4 | 5 | no |
| `jumping` | 4 | 5 | 14 | no |
| `failed` | 5 | 8 | 6 | no |
| `waiting` | 6 | 6 | 4 | yes |
| `running` | 7 | 6 | 12 | yes |
| `review` | 8 | 6 | 6 | yes |
| `look-000-157` (v2) | 9 | 8 | n/a | preview/export |
| `look-180-337` (v2) | 10 | 8 | n/a | preview/export |

The sprite editor and avatar frame picker derive their rows and atlas height
from `spriteVersionNumber`; v2 exposes labeled look cells while v1 remains
limited to the original nine rows. Playground players, swapped pets, local
NPCs, and remote NPCs derive UV row count from the loaded image height so v1
and v2 can coexist in the same room.

Animation responsibilities:

- `src/playground/animation/spriteAnimation.ts`: main state machine, jump,
  landing, sprint latch, hit stop, idle/wait transitions, and broadcast frame.
- `spriteAnimatorGround.ts`: ground-state transitions.
- `spriteAnimatorVisuals.ts`: frame index, idle bob, squash/stretch, lean, and
  footstep dust triggers.
- `spriteAtlas.ts`: UV offsets, horizontal flip, remote frame derivation, and
  final Three.js sprite material updates.
- `spriteEffects.ts`: sprint streaks, dust, after-images, and visual effects.

Playground controls include WASD/arrows for movement, Space for jump, sprint
behavior, fullscreen/touch controls, minimap, NPC controls, ball/trampoline
systems, and chat in room mode. When editing gameplay, verify both solo
playground and room playground because the same local animation state also feeds
remote broadcast frames.

## Multiplayer Rooms

The room system is intentionally provider-neutral above `src/realtime/adapters`.
The active Cloudflare adapter implements the generic room contract with
authenticated realtime transport. Use the source files below for implementation
details instead of duplicating wire-level client recipes in public docs.

Room setup:

1. `PlaygroundRouteLayers.tsx` opens room routes.
2. `PlaygroundRoomGate.tsx` loads room metadata, asks the user to pick a pet
   when needed, prepares the realtime client, joins the room, decides host vs
   guest, enforces room capacity, and lazy-loads `PetPlaygroundModal`.
3. `PetPlaygroundModal.tsx` owns the scene, HUD, minimap, chat bar, NPC picker,
   pet swap menu, and room handlers.
4. `usePlaygroundSceneLoop.ts` advances local simulation.
5. `broadcastRoomFrame.ts` sends the local simulation snapshot needed for
   remote rendering.
6. `usePlaygroundRoomHandlers.ts` applies presence, movement, chat, world,
   lifecycle, toy, NPC, and pet-swap updates.

Room payloads and handlers are typed in `src/realtime/roomTypes.ts`. When
changing them, update the generic types, the active adapter, and all room
handlers together. Do not publish raw event-emission examples or unauthenticated
room-client snippets in docs or skills.

Broadcasts are throttled and chat is trimmed/rate-limited in the adapter layer.
Keep those controls server/provider-side where possible. Hosts own ordinary
room world state; permanent collection rooms derive host/state behavior from
presence and collection routing. Verify both cases because they differ.

## Gallery, Collections, And Admin

Gallery API responses are typed in `src/domain/types.ts`. Browse surfaces
support query, tags, kind, content mode, sort, page size, favorites, user pages,
collections, creator leaderboard, likes, views, comments, downloads, and share
modals. The `discussed` gallery sort ranks pets by visible comment count and
surfaces recent comments above a most-discussed pets leaderboard.

Pet detail pages also support a flat guestbook-style comments surface. The
provider API owns persistence and authorization under `/api/pets/:id/comments`:
visible viewers can read comments, signed-in non-shadowbanned users can post and
react, and comment authors, pet owners, or admins can delete comments. Deleted
users' comments remain under `Anonymous`, while deleted pets cascade-delete
their comments. Comment notifications live under `/api/comments/notifications`
and are scoped to unread comments on the signed-in user's own pets; the
notification payload carries `petId` and `commentId` so the app can navigate to
the exact guestbook entry.

Visibility rules matter:

- Shadowbanned users cannot upload through the checked-in backend.
- Safe mode hides `nsfw` tagged pets.
- Admin-only surfaces can see moderation state and edit broader metadata.
- Download counts are not exposed equally to all viewers; check backend
  serialization before changing stats UI.

Collections have both browse pages and permanent playground routes. If changing
collections, verify list/detail pages, collection room routes, collection share
pages, live rail counts, and `add-collection` command text.

## Rebranding A Fork

Use env vars first; do not hardcode a fork's brand in feature code.

Required brand vars:

- `VITE_APP_NAME`
- `VITE_APP_HANDLE`
- `VITE_APP_TAGLINE`
- `VITE_APP_REPO_URL`

They flow into document metadata, share text, nav wordmark, social image
generation, and command snippets such as `npx <handle> add <id>`.

Replace static assets when branding changes:

- `public/favicon.ico`
- `public/assets/petshare-icon.png`
- `public/assets/petshare-logo.png`
- `public/assets/petshare-logo-nav.webp`
- `public/assets/petshare-mark.webp`
- `public/assets/petshare-social-preview.png`

Regenerate brand assets with `npm run build:social-card` and
`npm run build:nav-mark` when relevant.
