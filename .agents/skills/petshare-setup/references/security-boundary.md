# Security Boundary Reference

Use this reference when publishing the repository, documenting public setup,
reviewing exposure risk, or changing auth, moderation, realtime, upload, or
provider surfaces.

## Public Boundary

The public browser contract must stay provider-neutral:

- `VITE_APP_API_BASE_URL`
- `VITE_PUBLIC_APP_ORIGIN`
- `VITE_REALTIME_URL`
- `VITE_REALTIME_PUBLIC_KEY`
- `VITE_APP_NAME`
- `VITE_APP_HANDLE`
- `VITE_APP_TAGLINE`
- `VITE_APP_REPO_URL`

Do not add provider-specific public names such as `VITE_SUPABASE_*` or
`VITE_CLOUDFLARE_*` unless the user explicitly asks. Provider public keys may
be publishable by provider design, but they are still project-specific; do not
leak real project identifiers into examples.

## Never Commit

- `.env`, `.env.local`, `.env.*.local`
- API tokens, service-role keys, salts, private keys, database passwords
- provider account ids, zone ids, database ids, project refs
- auth dumps, user exports, migration exports, temporary cutover files
- generated assets from another operator's private data

The checked-in examples should use placeholders like `your-app.example.com`,
`your-pet-share`, and `replace-with-*`.

## Abuse-Resistance Rules

This skill is for trusted implementation work. Keep public docs useful without
turning them into attack recipes.

Allowed:

- source-file pointers for contracts and handlers
- high-level descriptions of auth, uploads, rooms, moderation, and storage
- defensive guidance about validation and provider boundaries
- secret variable names and the correct place to set them

Avoid:

- raw room transport routes or copy-paste realtime client snippets
- raw room event emission examples or replay scripts
- production load-test loops, scraper loops, or bulk upload automation
- exact rate-limit thresholds in public-facing docs unless required for trusted
  operator work
- validation bypass, owner spoofing, moderation-evasion, or shadowban-evasion
  instructions
- real credentials, project ids, salts, tokens, or env file contents

If asked for a security review, inspect code and configs, report risks, and
avoid exploit steps. If asked to document public setup, prefer contracts and
file references over raw wire-level examples.

## Exposure Check

Before publishing or handing off public code, search tracked files and generated
artifacts:

```bash
rg -n -i "token|secret|password|service_role|account|database_id|project_id|your-real-domain|your-real-email|supabase|api_key" . --glob '!node_modules/**' --glob '!dist/**'
```

Inspect all hits. Placeholders are fine; real credentials, provider project ids,
user exports, auth dumps, and local env files are not.

Also check:

```bash
/usr/bin/git status --short --ignored .env.local .env.cloudflare.local tmp dist tsconfig.tsbuildinfo
/usr/bin/git ls-remote --heads origin
/usr/bin/git ls-remote --tags origin
```

Ignored local files are not public by themselves, but they should not be
force-added or copied into public artifacts.
