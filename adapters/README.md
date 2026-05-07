# Adapters

Provider-specific implementations live here. The root app is the provider-neutral React/Vite frontend plus shared API/realtime contracts.

- `cloudflare-worker/` contains the checked-in backend, database, storage,
  realtime, and hosting adapter.
- `cloudflare-pages/` contains the shipped crawler/social-share page adapter.

New providers should add a new folder here and keep feature components under `src/` provider-neutral.
