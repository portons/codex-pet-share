# Agent Guide

This repo is intended to be workable by a fresh Codex/Claude session with no
private context. Keep changes small, provider-neutral at the public boundary,
and easy to verify from a clean checkout.

## First Read

1. Read `README.md`.
2. Read `docs/GETTING_STARTED.md` for zero-to-working setup.
3. Read `docs/PROVIDER_ADAPTERS.md` before changing auth, API, storage,
   realtime, social share pages, or deployment.
4. Read `adapters/cloudflare-worker/README.md` before changing the checked-in
   Cloudflare adapter.

## Public Provider Contract

The browser app should not depend on provider-named public env vars.

Required public build vars:

- `VITE_APP_API_BASE_URL`
- `VITE_PUBLIC_APP_ORIGIN`
- `VITE_REALTIME_URL`
- `VITE_REALTIME_PUBLIC_KEY`
- `VITE_APP_NAME`
- `VITE_APP_HANDLE`
- `VITE_APP_TAGLINE`
- `VITE_APP_REPO_URL`

Current adapter-specific vars live outside that public contract:

- `PET_STATS_SALT`
- `APP_NAME`
- `APP_HANDLE`
- `APP_TAGLINE`
- `APP_API_BASE_URL`
- `ASSET_PUBLIC_BASE_URL`
- `CORS_ALLOWED_ORIGINS`

Do not add provider-specific public names unless the user explicitly asks.

## Architecture Map

- `src/domain/*`: shared types, routing, API URLs, formatting, pet helpers,
  session storage, and frontend constants.
- `src/realtime/providerClient.ts`, `src/realtime/roomChannel.ts`: generic
  realtime surfaces used by the app.
- `src/realtime/adapters/*`: provider-specific realtime adapters and current
  adapter barrels.
- `src/app/App.tsx`: SPA composition.
- `src/app/useAppEntityData.ts`, `src/app/useAppRouteEffects.ts`,
  `src/app/useAppNavigationActions.ts`: route data, route effects, and
  navigation commands.
- `src/app/AppChrome.tsx`, `src/app/AppDialogs.tsx`: app shell chrome and
  modal composition.
- `src/app/styles.css`: CSS import manifest; feature CSS lives beside each
  feature folder.
- `src/admin/AdminPage.tsx`: admin workflows.
- `src/downloads/DownloadCommandRow.tsx`: terminal install command UI.
- `src/branding/brand.ts`: build-time brand strings.
- `src/playground/PetPlaygroundModal.tsx`: 3D playground composition.
- `src/playground/PlaygroundRouteLayers.tsx`: playground modal/room route layer.
- `src/playground/animation/*`: spritesheet atlas animation state machine,
  frame/UV application, sprint streaks, dust, and after-image sprite effects.
- `src/playground/core/*`: playground constants, scene setup, image loading,
  projection, and controls hint text.
- `src/playground/hooks/*`: playground-specific React hooks.
- `src/playground/room/*`: room gate, realtime room UI, remote actors, overlay,
  and room mode types.
- `src/playground/ui/*`: modal header, chat bar, pet picker, NPC picker,
  touch controls, and popover UI.
- `src/playground/world/*`: ball, trampoline, and NPC simulation systems.
- `adapters/cloudflare-worker/src/*`: current backend adapter.
- `adapters/cloudflare-worker/migrations/*`: current schema adapter.
- `adapters/cloudflare-worker/wrangler.toml`: current Cloudflare resource
  bindings and optional route template.
- `adapters/cloudflare-pages/functions/*`: static-host share-page adapter for crawlers.
- `scripts/*`: operator scripts.

If a file starts getting large, extract a real feature module instead of adding
another section to it.

## Setup Commands

```bash
npm install
cp .env.example .env.local
# Fill .env.local, then:
node scripts/check-public-build-env.mjs
npm run build
npm run dev
```

Vite defaults to `http://127.0.0.1:5173`.

## Sign-In Smoke

After the backend adapter is configured:

1. Open the app.
2. Register a new email/password user.
3. Sign out.
4. Sign back in.
5. Upload or seed one valid pet.
6. Open the pet detail page and a playground room.

For the current Cloudflare adapter, admin access is granted by updating the
signed-in user's `users.is_admin` field in D1; see `docs/GETTING_STARTED.md`.

## Validation

Before handoff, run:

```bash
npx tsc -b --pretty false
npm run build
```

For frontend changes, also open the app in a real browser and check the changed
route. For provider or env changes, verify `.env.example`,
`scripts/check-public-build-env.mjs`, and the docs agree exactly.
