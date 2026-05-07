# Getting Started From Zero

This is the agent-friendly path for a clean fork. It explains the public app
contract first, then points to the provider adapters.

## 1. Install

```bash
git clone https://github.com/your-org/your-pet-share.git
cd your-pet-share
npm install
cp .env.example .env.local
```

## 2. Choose Providers

The frontend only needs:

- an HTTP API base: `VITE_APP_API_BASE_URL`
- a public app origin: `VITE_PUBLIC_APP_ORIGIN`
- a realtime endpoint/key: `VITE_REALTIME_URL`, `VITE_REALTIME_PUBLIC_KEY`
- brand strings: `VITE_APP_NAME`, `VITE_APP_HANDLE`, `VITE_APP_TAGLINE`,
  `VITE_APP_REPO_URL`

The repository ships provider adapters under `adapters/`. Any provider must
implement the same app API and realtime contract described in
`docs/PROVIDER_ADAPTERS.md`.

## 3. Provider Values

```bash
VITE_APP_API_BASE_URL=https://api.your-app.example.com
VITE_PUBLIC_APP_ORIGIN=https://your-app.example.com
VITE_REALTIME_URL=https://realtime.your-provider.example.com
VITE_REALTIME_PUBLIC_KEY=replace-with-public-realtime-key
VITE_APP_NAME=Your Pet Share
VITE_APP_HANDLE=your-pet-share
VITE_APP_TAGLINE=A shareable home for your pixel pets.
VITE_APP_REPO_URL=https://github.com/your-org/your-pet-share

APP_API_BASE_URL=https://api.your-app.example.com
ASSET_PUBLIC_BASE_URL=https://assets.your-provider.example.com/pets
APP_NAME=Your Pet Share
APP_HANDLE=your-pet-share
APP_TAGLINE=A shareable home for your pixel pets.
PET_STATS_SALT=openssl-rand-hex-32-output
```

Use `docs/PROVIDER_ADAPTERS.md` for the API/realtime/storage contract. The
checked-in provider adapters document their provider-specific variables,
migrations, storage buckets, secrets, and deployment steps in their adapter
folders and runbooks.

## 4. Verify Env

```bash
node scripts/check-public-build-env.mjs
```

The command should print nothing and exit 0.

## 5. Run Locally

```bash
npm run dev
```

Open `http://127.0.0.1:5173`.

The local frontend calls the API and realtime provider from `.env.local`.
If the gallery is empty, seed a pet before debugging the UI.

## 6. Sign In

1. Open the app.
2. Click sign in.
3. Switch to register.
4. Create an email/password account.
5. Sign out and sign back in.

Promote that user through your provider's admin-user mechanism, then sign out
and sign back in before opening `/#/admin`. For the checked-in Cloudflare
Worker adapter, update the `users.is_admin` field in D1.

## 7. Seed A Pet

Use the signed-in app upload flow with a folder that contains `pet.json`,
`spritesheet.webp`, `share.png`, and `preview.webp`. For another backend, seed
through that provider's adapter while keeping the same public pet response
shape.

## 8. Smoke Checklist

- Gallery loads over `GET /api/pets`.
- Register, sign out, sign in all work.
- Upload or seeded pet detail renders animation states.
- Download package works.
- A collection or room can be opened.
- Two signed-in browser sessions can join the same room and see presence.
- Browser console has no errors.

## 9. Build

```bash
npm run build
```

`dist/` is a static site. Any static host can serve it. If your host supports
edge/serverless route functions, wire a share-page adapter to keep
crawler-friendly social share pages.
