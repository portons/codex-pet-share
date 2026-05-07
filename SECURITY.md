# Security Policy

## Supported Versions

Security fixes are handled on the current default branch.

## Reporting a Vulnerability

Open a private security advisory or contact the repository maintainer privately. Do not publish working exploit details before a fix is available.

## Secret Handling

Never commit or expose:

- `PET_STATS_SALT`
- backend database credentials
- deployment provider API tokens
- `.env` or `.env.local`

Only provider-neutral `VITE_*` variables from `.env.example` belong in the
browser build environment. Never expose service-role keys, database passwords,
private tokens, or salts through Vite.
