# Petshare Setup

Use this skill when an agent is asked to bring a fresh fork of this repository
from zero to a working deployment.

## Ground Rules

- Read `README.md`, `docs/GETTING_STARTED.md`, `docs/PROVIDER_ADAPTERS.md`,
  and `AGENTS.md` before editing.
- Keep the public browser contract provider-neutral. Do not add public
  provider-specific `VITE_*` names.
- Never commit `.env`, `.env.local`, API tokens, salts, database passwords, or
  provider account identifiers.
- If using the checked-in Cloudflare adapter, replace every placeholder in
  `adapters/cloudflare-worker/wrangler.toml` before deploying.

## Setup Path

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill the required public vars:
   - `VITE_APP_API_BASE_URL`
   - `VITE_PUBLIC_APP_ORIGIN`
   - `VITE_REALTIME_URL`
   - `VITE_REALTIME_PUBLIC_KEY`
   - `VITE_APP_NAME`
   - `VITE_APP_HANDLE`
   - `VITE_APP_TAGLINE`
   - `VITE_APP_REPO_URL`
4. Choose a backend adapter. For the checked-in Cloudflare adapter:
   - create a Worker, D1 database, R2 bucket, and Durable Object binding
   - set `AUTH_SECRET` and `PET_STATS_SALT` with `wrangler secret put`
   - update `adapters/cloudflare-worker/wrangler.toml`
   - run `npm run adapter:cloudflare:migrate`
5. Run `node scripts/check-public-build-env.mjs`.
6. Run `npm run build`.
7. Run `npm run dev` and open `http://127.0.0.1:5173`.
8. Register, sign out, sign in, upload one valid pet, open its detail page,
   and open a room.

## Verification Before Handoff

- `npm run build`
- `npm run adapter:cloudflare:typecheck` when the Cloudflare adapter changed
- Search for private data with:
  `rg -n -i "token|secret|password|service_role|account|database_id|your-real-domain|your-real-email" . --glob '!node_modules/**' --glob '!dist/**'`
- Confirm generated social assets under `public/assets/social/` are only from
  the fork operator's own data before committing them.
