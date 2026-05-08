# Provider Adapters

The app should be provider-agnostic at its public boundary. Checked-in
provider modules are adapters, not the project identity.

## Public Frontend Contract

The browser reads these provider-neutral env vars:

| Var | Purpose |
|---|---|
| `VITE_APP_API_BASE_URL` | HTTP API base that serves `/api/*`. |
| `VITE_PUBLIC_APP_ORIGIN` | Canonical frontend origin for share URLs. |
| `VITE_REALTIME_URL` | Realtime provider URL. |
| `VITE_REALTIME_PUBLIC_KEY` | Public key used by the realtime browser client. |

Brand vars are separate: `VITE_APP_NAME`, `VITE_APP_HANDLE`,
`VITE_APP_TAGLINE`, `VITE_APP_REPO_URL`.

## Current Adapter Files

| Concern | Current implementation |
|---|---|
| Cloudflare Worker API | `adapters/cloudflare-worker/src/*` |
| Cloudflare Worker schema | `adapters/cloudflare-worker/migrations/*` |
| Cloudflare Worker storage/realtime | D1, R2, Durable Objects configured in `adapters/cloudflare-worker/wrangler.toml` |
| Generic realtime exports | `src/realtime/providerClient.ts`, `src/realtime/roomChannel.ts` |
| Current realtime adapter barrels | `src/realtime/adapters/currentClient.ts`, `src/realtime/adapters/currentRoomChannel.ts` |
| Cloudflare realtime browser adapter | `src/realtime/adapters/cloudflareClient.ts` |
| Cloudflare room channel adapter | `src/realtime/adapters/cloudflareRoomChannel.ts` |
| Social share pages | `adapters/cloudflare-pages/functions/*` |

Provider-specific code should stay in those adapter areas or in clearly named
new adapter modules.

## API Shape A Provider Must Implement

The frontend expects an API under `VITE_APP_API_BASE_URL` with these groups:

- `GET /api/pets`, `GET /api/pets/:id`, `POST /api/pets`
- `GET /api/pets/mine`, `GET /api/pets/favorites`
- `POST|DELETE /api/pets/:id/like`
- `GET /api/pets/:id/download`, `GET /api/pets/:id/spritesheet`,
  `GET /api/pets/:id/share-image`
- `POST /api/auth/login`, `POST /api/auth/register`,
  `POST /api/auth/refresh`, `GET /api/auth/me`
- `GET /api/users/:id/pets`, `GET /api/creators/leaderboard`
- `GET /api/collections`, `GET /api/collections/:slug?page=<n>&pageSize=<n>`
- `POST /api/rooms`, `GET /api/rooms/:id`, `POST /api/rooms/:id/close`
- admin routes under `/api/admin/*`

Responses should match the TypeScript types in `src/domain/types.ts`. Collection
detail responses include the same pagination metadata shape as gallery
responses.

## Auth Contract

Auth responses return:

```ts
{
  user: User;
  session: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  } | null;
}
```

The frontend stores this session in localStorage and refreshes through
`POST /api/auth/refresh`.

## Realtime Contract

The room implementation uses a frontend room-channel interface. A provider
adapter must support these concepts:

- private room channel keyed by room id
- presence state for users and pets
- broadcast events for movement, chat, toys, NPCs, pet swap, and host closing
- token update before subscribing

The checked-in Cloudflare adapter implements this with Durable Objects. Add new
providers behind the same adapter boundary instead of spreading provider checks
through the playground.

## Static Share Pages

`adapters/cloudflare-pages/functions/*` generate crawler-readable HTML for pets,
creators, collections, and gallery sort pages. Hosts without route functions can
still serve the SPA, but social unfurls for `/share/*`, `/users/*`,
`/collections/*`, and `/gallery/*` need an equivalent serverless/edge adapter.

Use generic env vars for these functions:

- `APP_API_BASE_URL`
- `PUBLIC_APP_ORIGIN`
- `APP_NAME`
- `APP_HANDLE`

## Operator Asset Scripts

Social-card scripts read:

- `APP_API_BASE_URL`
- `ASSET_PUBLIC_BASE_URL`
- `APP_NAME`
- `APP_HANDLE`
- `APP_TAGLINE`

Example:

```bash
https://assets.your-provider.example.com/pets
```
