# Codex Pet Share

A self-hostable web app for sharing animated pixel pets. Upload a spritesheet, browse a community gallery, drop into multiplayer playground rooms, and pull pets straight into your terminal via a one-line CLI command.

Open-source so you can run your own instance for any pet/spritesheet community you like, or fork it as a starting point for any "share an asset, embed it elsewhere" app. Provider contracts are explicit so new backends can be added without changing feature code.

## What you'll need to run your own

- **Node 20+** and `npm`.
- A backend that implements the app API and realtime room contract.
- A static host for `dist/`.
- For the checked-in adapter: a Cloudflare account with Workers, D1, R2, and Durable Objects. For another provider, implement the contracts in `docs/PROVIDER_ADAPTERS.md`.

There is no shared demo URL. Every fork brings up its own backend and storage.

## Stack at a glance

| Layer | Contract | Shipped adapter |
|---|---|---|
| Frontend | React 19 + Vite 7 + TypeScript | Static SPA. |
| Backend API | HTTP `/api/*` contract | Cloudflare Worker in `adapters/cloudflare-worker/src/*`. |
| Persistence | Pets, profiles, likes, collections, rooms | Cloudflare D1 migrations in `adapters/cloudflare-worker/migrations/*`. |
| Storage | Pet packages and rendered share PNGs | Cloudflare R2. |
| Realtime | Presence + broadcast room channel | Cloudflare Durable Objects. |
| Hosting | Static host plus optional share-page route functions | Worker Assets in the Cloudflare Worker adapter. |

No global state library, no design system framework — just plain CSS variables and React function components.

## Quick start (local dev)

```bash
git clone https://github.com/your-org/your-pet-share.git
cd your-pet-share
npm install
cp .env.example .env.local
# Fill in .env.local — see docs/GETTING_STARTED.md for what each var is.
npm run dev
```

Vite serves at `http://127.0.0.1:5173`. The dev server hits the API and realtime provider from `.env.local`, so for the gallery to show pets you need either a seeded backend or a working remote project.

The build (`npm run build`) fails fast if any required env var is missing or malformed — fresh forks get a clear error pointing at exactly what to set.

## Deploy to production

Start with **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)**. If you are handing the repo to an AI coding agent, also point it at **[.agents/skills/petshare-setup/SKILL.md](.agents/skills/petshare-setup/SKILL.md)**:

1. Fill the provider-neutral public env vars.
2. Bring up a backend adapter.
3. Register and sign in.
4. Seed a pet.
5. Run the smoke checklist.

Provider boundaries live in **[docs/PROVIDER_ADAPTERS.md](docs/PROVIDER_ADAPTERS.md)**.

The checked-in Cloudflare adapter walkthrough lives in **[adapters/cloudflare-worker/README.md](adapters/cloudflare-worker/README.md)**:

1. Create D1/R2 resources and set Worker secrets.
2. Build the frontend with the required `VITE_*` env vars.
3. Apply D1 migrations.
4. Deploy the Worker and wire up your custom domain/CORS.

## Rebrand for your fork

Brand strings are parametrized via four build-time env vars — no source code edits needed for a fresh rebrand:

```bash
VITE_APP_NAME="My Pet Share"
VITE_APP_HANDLE="my-pet-share"
VITE_APP_TAGLINE="A shareable home for your pixel pets."
VITE_APP_REPO_URL="https://github.com/your-org/my-pet-share"
```

These flow into the `<title>`, OG metadata, nav wordmark, share-image canvas text, share-text templates, and the `npx my-pet-share add <id>` CLI hint shown next to every pet.

Replace `public/favicon.ico` and `public/assets/petshare-*.png` with your own art. Full rebrand checklist in **[docs/REBRANDING.md](docs/REBRANDING.md)**.

## Operator scripts

Run from a trusted environment (local dev or CI).

| Script | Purpose |
|---|---|
| `npm run build:social-card` | Rebuild `public/assets/petshare-social-preview.png` (the OG image). |
| `npm run build:nav-mark` | Rebuild the nav wordmark PNG. |

## Pet package format

Upload a folder containing exactly:

- `pet.json` — manifest (name, description, kind, and optional `spriteVersionNumber`).
- `spritesheet.webp` — either the original v1 `1536 x 1872` atlas (9 rows × 8 columns), or a v2 `1536 x 2288` atlas (11 rows × 8 columns) with `spriteVersionNumber: 2`.

V2 keeps the original nine animation rows, adds a dedicated neutral look cell at
row 0 / column 6, and adds two rows containing 16 clockwise look directions.
The backend adapter validator rejects mismatched manifest versions/dimensions,
schema errors, and unknown `kind`s; v1 packages remain supported without a
version field.

The gallery labels both formats: v2 is the new format, while v1 is legacy and supported. Real v1/v2 Debug Duck packages live under `test-assets/pets/`; run `npm run check:pet-fixtures` to verify their manifest markers and atlas dimensions.

## Secret boundary

Never commit, screenshot, or expose to a `VITE_*` env var:

- `PET_STATS_SALT` (any 32+ random chars; used to hash visitor IPs for view-count dedup)
- `AUTH_SECRET`
- `RESEND_API_KEY`
- `AUTH_GOOGLE_CLIENT_SECRET`
- `AUTH_X_CLIENT_SECRET`
- backend database credentials
- Cloudflare API tokens

Provider public keys may be publishable by provider design, but they are still project-specific. The build-env validator (`scripts/check-public-build-env.mjs`) blocks any `VITE_*` whose name matches `(SERVICE_ROLE|SECRET|TOKEN|PASSWORD|PET_STATS_SALT|PRIVATE)/i`.

## Privacy note

View and download counters are deduped per day. For anonymous visitors, the shipped backend adapter hashes `PET_STATS_SALT` with the trusted edge IP header and user agent before storing the event key. Keep `PET_STATS_SALT` secret.

## Security checklist for production

- Keep storage service-role keys only in backend secrets and trusted operator environments.
- Add host/provider rate limiting on `/api/auth/*`, `/api/admin/*`, `/api/pets` (POST), and `/share/*` paths.
- Browser localStorage holds the session JWT — known v1 tradeoff. Hardening to HttpOnly cookies is an open follow-up.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — short version: open an issue first for non-trivial changes, then open a PR against `master`.

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgements

Built for self-hosted pixel-pet communities and Codex-compatible pet packages. Forks should set their own brand via the `VITE_APP_*` env vars above.
