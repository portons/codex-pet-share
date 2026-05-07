# Cloudflare Pages Adapter

This folder is the shipped crawler/share-page adapter. The app can run on any static host without it; hosts that need rich social unfurls should provide equivalent route functions for `/share/*`, `/users/*`, `/collections/*`, and `/gallery/*`.

- `functions/*` implements Cloudflare Pages Functions for social-share HTML.
- `public/_headers` contains Cloudflare Pages cache/security headers for the static build.
- `wrangler.toml` is the Cloudflare Pages deploy config template.

When using this adapter, make this directory the Pages project root in CI or copy its adapter files into the host-specific build context so Cloudflare sees `functions/` and `_headers` in the locations it expects.
