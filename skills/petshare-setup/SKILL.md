---
name: petshare-setup
description: Use when an agent needs to fork, rebrand, deploy, adapt, or rebuild a Codex Pet Share style app: animated pet uploads, generated previews, gallery/download flows, Cloudflare or custom provider adapters, and multiplayer playground rooms.
---

# Petshare Setup

Use this skill when an agent is asked to spin up, fork, rebrand, deploy, or
modify this repository or a close derivative. The app is a self-hostable
React/Vite pixel-pet sharing surface: users upload Codex-compatible pet
packages, browse animated previews, download packages/GIFs, and join
multiplayer playground rooms.

## Non-Negotiables

- Read `README.md`, `docs/GETTING_STARTED.md`, `docs/PROVIDER_ADAPTERS.md`,
  `AGENTS.md`, and this file before editing.
- Keep changes literal to the request. Do not add fallbacks, backwards
  compatibility, provider-specific public env vars, or unrelated hardening.
- Keep the browser public contract provider-neutral. Public build vars are only:
  `VITE_APP_API_BASE_URL`, `VITE_PUBLIC_APP_ORIGIN`, `VITE_REALTIME_URL`,
  `VITE_REALTIME_PUBLIC_KEY`, `VITE_APP_NAME`, `VITE_APP_HANDLE`,
  `VITE_APP_TAGLINE`, and `VITE_APP_REPO_URL`.
- Never commit `.env`, `.env.local`, API tokens, salts, database passwords,
  provider account identifiers, generated migration exports, or local auth data.
- Use provider adapters as replaceable boundaries. Feature code under `src/`
  should not branch on provider names.
- For ports, follow `AGENTS.md`: check a requested port before starting a
  process, and never kill reserved ports unless explicitly asked.
- Do not turn this skill into an abuse manual. Do not add copy-paste scripts,
  unauthenticated client examples, raw room-event payload recipes, rate-limit
  thresholds, bypass instructions, scraping loops, or moderation-evasion advice.

## Repository Map

- `src/domain/*`: shared types, route parsing, API URLs, session storage,
  gallery constants, pet kind/tag config, and sprite atlas constants.
- `src/app/*`: SPA composition, route effects, API/session hooks, shell chrome,
  modal composition, and cross-feature refresh/navigation.
- `src/uploads/*`: file inputs, manifest parsing, slug normalization, upload
  validation preview, generated `share.png`, generated `preview.webp`, and
  `POST /api/pets` form assembly.
- `src/pets/*`: gallery/detail pet surfaces, sprite previews, cursor preview,
  metadata editing, tag/kind management, delete, share, and GIF export wiring.
- `src/downloads/*`: package modal, install command UI, spritesheet fetch, GIF
  encoding, and client-side blob download.
- `src/gallery/*`: browse/search/filter/sort/pagination, creator pages,
  collections, live room rail, and leaderboard.
- `src/playground/*`: Three.js playground, sprite animation, room overlays,
  realtime handlers, UI controls, minimap, chat, NPCs, ball, and trampoline.
- `src/realtime/providerClient.ts` and `src/realtime/roomChannel.ts`: generic
  frontend realtime exports.
- `src/realtime/adapters/*`: current provider-specific realtime implementation.
- `adapters/cloudflare-worker/*`: checked-in API, D1 schema, R2 storage,
  Durable Object realtime, Worker Assets hosting, and Cloudflare deployment.
- `adapters/cloudflare-pages/*`: optional crawler/social-share page functions
  for static hosts.
- `scripts/*`: public env validation and generated brand/social-card assets.

If a feature file starts absorbing unrelated behavior, extract into the matching
feature folder rather than adding another section to a large component.

## Stack And Build Contract

The shipped stack is React 19, Vite 7, TypeScript, plain CSS, Three.js,
Cloudflare Workers, D1, R2, and Durable Objects. There is no global state
library and no design system framework.

Required local path:

```bash
npm install
cp .env.example .env.local
node scripts/check-public-build-env.mjs
npm run build
npm run dev
```

Vite defaults to `http://127.0.0.1:5173`.

The build validator fails if required public env vars are missing, malformed, or
if a `VITE_*` name looks secret-like. For provider/env changes, verify
`.env.example`, `scripts/check-public-build-env.mjs`, docs, and adapter config
agree exactly.

## Provider Boundary

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
- R2 for `pet.json`, `spritesheet.webp`, `share.png`, and `preview.webp`
- Durable Objects for room presence and broadcasts
- Wrangler secrets for `AUTH_SECRET` and `PET_STATS_SALT`

## Abuse-Resistance Boundary

This skill is for implementation and deployment by trusted agents. It should
name contracts and source files, but it should not package the app's public
interfaces into attack recipes.

Keep this distinction:

- Good: "room events are typed in `src/realtime/roomTypes.ts`; update handlers
  and provider adapters together."
- Bad: raw WebSocket routes, event emission examples, replay scripts, load-test
  snippets against production, or exact throttling/rate-limit values.
- Good: "uploads require backend validation and authenticated users."
- Bad: examples for bulk upload automation, bypassing validation, spoofing
  owners, hiding NSFW state, or evading shadowban/admin controls.
- Good: secret variable names and where to set them.
- Bad: real project ids, tokens, salts, auth dumps, user exports, or local env
  contents.

If the user asks for a public-facing guide, omit internal moderation and room
wire details unless they are necessary for a trusted operator. If the user asks
for security review, inspect code and configs, report risks, and do not provide
exploit instructions.

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
  "kind": "object"
}
```

`kind` must be one of `object`, `animal`, `person`, or `creature`. The frontend
normalizes the manifest id into a lowercase hyphen slug before upload. The
backend enforces a nonempty slug, `displayName` up to 80 chars, `description` up
to 280 chars, and `spritesheetPath: "spritesheet.webp"`.

Spritesheet contract:

- Atlas size: `1536x1872`
- Grid: 8 columns x 9 rows
- Cell size: `192x208`
- File type: WebP

Upload flow:

1. `src/uploads/UploadPages.tsx` collects `pet.json`, `spritesheet.webp`, kind,
   and tags.
2. `src/uploads/UploadValidationPreview.tsx` previews manifest parse state,
   normalized id, atlas size, and cell size before submit.
3. `src/uploads/uploadAssets.ts` generates:
   - `share.png`: 1200x630 PNG for social cards
   - `preview.webp`: 5472x104 WebP preview strip, one 96x104 frame for every
     frame in every animation state
4. `src/uploads/useUploadWorkflow.ts` posts multipart form fields
   `manifest`, `spritesheet`, `shareImage`, `previewImage`, `kind`, and `tags`
   to `POST /api/pets`.
5. The backend validates all files, stores the four assets, records a validation
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
- Preloads both `previewUrl` and `spritesheetUrl`.
- Uses `idle`, `waiting`, `running-left`, and `running-right`.
- Clamps to viewport edges and tilts based on horizontal pointer speed.

GIF export is generated on demand from the canonical API spritesheet route:

- `GET /api/pets/:id/spritesheet`
- `gifenc` encodes one selected animation state.
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
details instead of duplicating wire-level client recipes in this skill.

Room setup:

1. `PlaygroundRouteLayers.tsx` opens room routes.
2. `PlaygroundRoomGate.tsx` loads room metadata, asks the user to pick a pet
   when needed, prepares the realtime client, joins the room, decides host vs
   guest, enforces `MAX_ROOM_USERS`, and lazy-loads `PetPlaygroundModal`.
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
collections, creator leaderboard, likes, views, downloads, and share modals.

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

## Verification Before Handoff

Always run:

```bash
npx tsc -b --pretty false
npm run build
```

When the Cloudflare adapter changed, also run:

```bash
npm run adapter:cloudflare:typecheck
```

For frontend/UI/playground changes, open the changed route in a real browser and
verify the interaction. For room changes, test at least one hosted room and one
joined room with two sessions. For upload changes, upload or seed one valid pet
and inspect detail, gallery preview, package download, GIF export, and
playground load.

Before publishing or handing off public code, search tracked files and generated
artifacts for private data:

```bash
rg -n -i "token|secret|password|service_role|account|database_id|project_id|your-real-domain|your-real-email|supabase|api_key" . --glob '!node_modules/**' --glob '!dist/**'
```

Then inspect all hits. Placeholders are fine; real credentials, provider
project ids, user exports, auth dumps, and local env files are not.

## Common Change Recipes

### Spin Up A New Fork

1. Clone, install, and copy `.env.example` to `.env.local`.
2. Set provider-neutral public env and brand env.
3. Choose a backend provider.
4. For Cloudflare, create Worker, D1, R2, and Durable Object resources; set
   `AUTH_SECRET` and `PET_STATS_SALT` with Wrangler secrets; update only the
   adapter config values that correspond to created resources.
5. Run D1 migrations.
6. Build and run the app.
7. Register, sign out, sign in, upload one valid pet, open detail, open
   playground, and open a room.

### Add A New Backend Provider

1. Add provider code under `adapters/<provider>/`.
2. Implement the same HTTP response shapes from `src/domain/types.ts`.
3. Implement the same upload asset contract and validation behavior.
4. Add realtime code under `src/realtime/adapters/`.
5. Update only `currentClient.ts` and `currentRoomChannel.ts` to point to the
   new implementation after it satisfies the room interface.
6. Keep docs provider-neutral except for the adapter-specific README.

### Change The Sprite Atlas

1. Update `src/domain/config.ts` and `src/playground/core/config.ts` together.
2. Update backend validation dimensions in
   `adapters/cloudflare-worker/src/api/validation.ts`.
3. Update preview generation and GIF export assumptions.
4. Verify upload validation, gallery previews, detail previews, GIF export, solo
   playground, and room playback.

### Change Multiplayer Behavior

1. Start from `src/realtime/roomTypes.ts` and the `RoomHandle` contract.
2. Update the provider adapter and all room handlers together.
3. Keep event payloads serializable and small.
4. Verify host, guest, leave/close, pet swap, chat, position, NPCs, toys, and
   collection permanent rooms.

### Change Uploads Or Asset Storage

1. Keep `pet.json` and `spritesheet.webp` as the package contract unless the
   user explicitly changes it.
2. Preserve generated `share.png` and `preview.webp` as app assets.
3. Update frontend generation, backend validation, storage writes, serializer
   URLs, and download endpoint together.
4. Verify upload error messages, validation card, detail route, share image,
   preview strip, package zip, and room sprite loading.
