# API Keys

Signed-in users can create API keys for agent-assisted pet uploads and
maintenance. API keys are shown once and are stored hashed in the backend.

## Create A Key

The app exposes key management in Account Settings. The API shape is also:

```bash
curl -sS "$VITE_APP_API_BASE_URL/api/auth/api-keys" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Codex uploader"}'
```

The response includes `apiKey.key` once:

```json
{
  "apiKey": {
    "id": "key_id",
    "name": "Codex uploader",
    "key": "cps_secret",
    "createdAt": "2026-06-28T00:00:00.000Z",
    "lastUsedAt": null,
    "revokedAt": null
  }
}
```

## List And Revoke

```bash
curl -sS "$VITE_APP_API_BASE_URL/api/auth/api-keys" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

```bash
curl -sS -X DELETE "$VITE_APP_API_BASE_URL/api/auth/api-keys/$KEY_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

List responses never include plaintext key secrets.

## Upload A Pet

Use the API key as a bearer token on the existing upload endpoint:

```bash
curl -sS "$VITE_APP_API_BASE_URL/api/pets" \
  -H "Authorization: Bearer $CODEX_PETS_API_KEY" \
  -F manifest=@pet.json \
  -F spritesheet=@spritesheet.webp \
  -F shareImage=@share.png \
  -F previewImage=@preview.webp \
  -F posterImage=@poster.webp \
  -F kind=object \
  -F 'tags=["cute"]'
```

`kind` must be `object`, `animal`, `person`, or `creature`. Tags must be a JSON
array using values from `src/domain/config.ts`. A duplicate pet id returns
`409`; update an existing pet with the maintenance endpoints below.

## Maintain A Pet

API keys can update pets owned by the key's user. They do not grant admin
permissions.

```bash
curl -sS -X PATCH "$VITE_APP_API_BASE_URL/api/pets/$PET_ID/tags" \
  -H "Authorization: Bearer $CODEX_PETS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Updated name","description":"Updated description","kind":"object","tags":["cute"]}'
```

```bash
curl -sS -X PATCH "$VITE_APP_API_BASE_URL/api/pets/$PET_ID/spritesheet" \
  -H "Authorization: Bearer $CODEX_PETS_API_KEY" \
  -F spritesheet=@spritesheet.webp \
  -F shareImage=@share.png \
  -F previewImage=@preview.webp \
  -F posterImage=@poster.webp
```

Non-admin API keys cannot remove an existing `nsfw` tag.

Metadata updates refresh the downloadable `pet.json`. The generated `share.png`
asset is replaced when sprite assets are replaced through the spritesheet
maintenance endpoint.
