# Cloudflare Worker Adapter

This adapter implements the app API, storage, hosting, and realtime contracts
with Cloudflare services:

- Worker Assets serve the Vite build.
- D1 stores users, sessions, pets, likes, collections, and room metadata.
- R2 stores pet packages and generated social/preview/poster images.
- Durable Objects provide multiplayer room presence and broadcast.

Secrets are set with Wrangler and are not committed:

```sh
npx wrangler secret put AUTH_SECRET -c adapters/cloudflare-worker/wrangler.toml
npx wrangler secret put PET_STATS_SALT -c adapters/cloudflare-worker/wrangler.toml
npx wrangler secret put RESEND_API_KEY -c adapters/cloudflare-worker/wrangler.toml
npx wrangler secret put AUTH_EMAIL_FROM -c adapters/cloudflare-worker/wrangler.toml
npx wrangler secret put AUTH_GOOGLE_CLIENT_ID -c adapters/cloudflare-worker/wrangler.toml
npx wrangler secret put AUTH_GOOGLE_CLIENT_SECRET -c adapters/cloudflare-worker/wrangler.toml
npx wrangler secret put AUTH_X_CLIENT_ID -c adapters/cloudflare-worker/wrangler.toml
npx wrangler secret put AUTH_X_CLIENT_SECRET -c adapters/cloudflare-worker/wrangler.toml
```

Resource setup:

```sh
npx wrangler d1 create your-pet-share
npx wrangler r2 bucket create your-pet-share-assets
npm run adapter:cloudflare:migrate
```

After creating the D1 database, copy the returned `database_id` into
`adapters/cloudflare-worker/wrangler.toml`. Replace the placeholder app origin,
CORS origins, Worker name, and route before deploying.

The adapter accepts both Codex pet atlas formats. V1 uses a `1536x1872` WebP
and no manifest version marker. V2 uses a `1536x2288` WebP and requires
`spriteVersionNumber: 2`; the final two rows contain 16 clockwise look
directions and row 0 / column 6 contains the dedicated neutral look cell.
Upload validation keeps the manifest marker, atlas height, and
generated preview-strip width in sync.
