---
name: petshare-setup
description: >-
  Use when an agent needs to fork, rebrand, deploy, adapt, or rebuild a Codex
  Pet Share style app with animated pet uploads, generated previews, gallery
  downloads, provider adapters, and multiplayer playground rooms.
---

# Petshare Setup

Use this skill when an agent is asked to spin up, fork, rebrand, deploy, or
modify this repository or a close derivative. The app is a self-hostable
React/Vite pixel-pet sharing surface: users upload Codex-compatible pet
packages, browse animated previews, download packages/GIFs, and join
multiplayer playground rooms.

This is a repo-scoped Codex skill. Keep it under
`.agents/skills/petshare-setup/` so Codex can discover it from the repository.

## First Read

Before editing, read:

- `README.md`
- `docs/GETTING_STARTED.md`
- `docs/PROVIDER_ADAPTERS.md`
- `AGENTS.md`
- `references/petshare-architecture.md` when touching app behavior, uploads,
  previews, animations, rooms, provider adapters, or deployment
- `references/security-boundary.md` when publishing, documenting public setup,
  reviewing exposure risk, or changing auth/moderation/provider surfaces

## Non-Negotiables

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
- Do not turn this skill into an abuse manual. Do not add copy-paste scripts,
  unauthenticated client examples, raw room-event payload recipes, rate-limit
  thresholds, bypass instructions, scraping loops, or moderation-evasion advice.
- For ports, follow `AGENTS.md`: check a requested port before starting a
  process, and never kill reserved ports unless explicitly asked.

## Core Workflow

1. Identify whether the task is setup, provider work, upload/asset work,
   preview/GIF work, animation/playground work, multiplayer rooms, rebranding,
   or security/publication review.
2. Load only the reference file needed for that surface.
3. Inspect current source before deciding; this repo has explicit adapter and
   feature boundaries.
4. Make the smallest code/doc changes that satisfy the user request.
5. Run the relevant validation commands below.
6. If publishing or handing off public code, run the exposure checks from
   `references/security-boundary.md`.

## Repository Map

- `src/domain/*`: shared types, route parsing, API URLs, session storage,
  gallery constants, pet kind/tag config, and sprite atlas constants.
- `src/app/*`: SPA composition, route effects, API/session hooks, shell chrome,
  modal composition, and cross-feature refresh/navigation.
- `src/uploads/*`: file inputs, manifest parsing, slug normalization, upload
  validation preview, generated `share.png`, generated `preview.webp`,
  generated `poster.webp`, and `POST /api/pets` form assembly.
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

## Setup Path

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

## Validation Before Handoff

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
2. Preserve generated `share.png`, `preview.webp`, and `poster.webp` as app
   assets.
3. Update frontend generation, backend validation, storage writes, serializer
   URLs, and download endpoint together.
4. Verify upload error messages, validation card, detail route, share image,
   preview strip, package zip, and room sprite loading.
