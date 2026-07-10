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
- `PATCH /api/pets/:id/tags` for owner/admin updates to `displayName`, `description`, `kind`, and tags
- `GET /api/pets/:id/comments`,
  `POST /api/pets/:id/comments`,
  `DELETE /api/pets/:id/comments/:commentId`,
  `POST|DELETE /api/pets/:id/comments/:commentId/reactions`
- `GET /api/comments/notifications`,
  `POST /api/comments/notifications/read`
- `PATCH /api/pets/:id/spritesheet` for owner/admin replacement of an uploaded pet's generated sprite assets
- `GET /api/pets/:id/download`, `GET /api/pets/:id/spritesheet`,
  `GET /api/pets/:id/share-image`
- `POST /api/auth/login`, `POST /api/auth/register`,
  `POST /api/auth/refresh`, `GET|PATCH|DELETE /api/auth/me`
- `GET|POST /api/auth/api-keys`, `DELETE /api/auth/api-keys/:id`
- `GET /api/users/:id/pets`, `GET /api/creators/leaderboard`
- `GET /api/collections`, `GET /api/collections/:slug?page=<n>&pageSize=<n>`
- `POST /api/rooms`, `GET /api/rooms/:id`, `POST /api/rooms/:id/close`
- admin routes under `/api/admin/*`

Pet responses include `spriteVersionNumber` (`1` or `2`). V1 packages use a
`1536x1872` WebP atlas and may omit the manifest field. V2 packages use a
`1536x2288` WebP atlas and must set `spriteVersionNumber: 2`; rows 9-10 contain
16 clockwise look directions in 22.5-degree steps, while row 0 / column 6 is
the dedicated neutral look cell. Providers should validate
the manifest marker and atlas height together while continuing to serve v1.
Generated `preview.webp` is `5472x104` for v1 and `7008x104` for v2; generated
`poster.webp` remains `192x208` for both.

Responses should match the TypeScript types in `src/domain/types.ts`. Collection
detail responses include the same pagination metadata shape as gallery
responses. Gallery sort values are `new`, `popular`, `views`, `discussed`,
and `random`; `discussed` ranks pets by visible comment count and can include
`recentComments` for the current filtered view so the frontend can render a
recent-comment strip above the most-discussed pets leaderboard.
Gallery requests may also pass `version=1` or `version=2`; providers should
apply that filter before pagination and calculate totals from the filtered set.

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

API keys are created from a signed-in browser session and can authenticate
agent uploads to `POST /api/pets` plus owner-safe maintenance through
`PATCH /api/pets/:id/tags` and `PATCH /api/pets/:id/spritesheet`. Providers
should store API keys hashed and return the plaintext key only once on
creation. API keys do not grant admin permissions.

Account removal is `DELETE /api/auth/me` with `{ "deletePets": boolean }`.
When `deletePets` is false, uploaded pets remain public with no owner and are
rendered as `Anonymous`.

Pet comments are flat, pet-scoped notes. Visitors who can see a pet can read
its visible comments. Signed-in, non-shadowbanned users can post comments and
toggle comment reactions. Comment authors, pet owners, and admins can delete
comments. When a user is deleted, their comments remain visible as `Anonymous`
unless the commented pet itself is deleted.

Comment notifications are computed for signed-in owners of uploaded pets. They
include unread comments on the viewer's own pets, exclude the viewer's own
comments, and expose a `commentId` that can be used with
`GET /api/pets/:id/comments?commentId=<commentId>` to load the page containing
that comment.

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
