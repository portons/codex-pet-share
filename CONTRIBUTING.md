# Contributing

Thanks for picking this up. Bug reports, doc fixes, and small features are all welcome — please open an issue first for anything non-trivial so we can talk it through before you spend implementation time.

## Dev quickstart

```bash
git clone https://github.com/your-org/your-pet-share.git
cd your-pet-share
npm install
cp .env.example .env.local
# Fill in .env.local — see docs/GETTING_STARTED.md
npm run dev
```

Vite serves the SPA at `http://127.0.0.1:5173`. The dev server hits the API
and realtime provider from `.env.local`, so for the gallery to populate you'll
need either a seeded backend adapter or a working remote project.

## Style notes

- **TypeScript strict** is on. `npm run build` runs `tsc -b` followed by `vite build` and the tree-shaking checker — PRs must pass both.
- **No new dependencies** without justification in the PR description. The bundle is already 600 KB gzipped and most of that is `three.js` for the playground.
- **React 19**, function components, hooks. Lean on `Suspense` + `lazy` imports for code-split boundaries (the heavy 3D modal is already lazy). No global state libraries.
- **Plain CSS** in `src/app/styles.css` with CSS variables. No Tailwind, no styled-components, no design-system framework.
- **Module boundaries**: keep public provider contracts in `src/domain/*`.
  Put provider-specific code in adapter modules instead of spreading it through
  feature components.
- **Comments explain *why***, not *what*. Keep rationale comments for
  non-obvious provider or realtime behavior.
- **No emojis** in source code or commit messages.

## Reporting issues

Open a GitHub issue in your fork or upstream project. Include:

- Your browser + version.
- The URL hash route (`#/pets/foo`, `#/collections/bar/play`, etc.).
- For backend issues: relevant adapter logs.
- For realtime issues on the checked-in Cloudflare adapter: relevant Worker
  logs and the room route you tested.

## Security disclosures

Don't open public issues for unpatched vulnerabilities. Use your upstream project's private security advisory or maintainer contact path.

## Commit style

- Imperative present tense ("Add X" not "Added X" or "Adds X").
- First line under 72 chars; body wraps at 72.
- Reference the issue number when applicable: `Fix room presence drop (#42)`.
- Keep commits focused — one logical change per commit. The history is a debugging tool, not a diary.

## PR checklist

Before opening a PR:

- [ ] `npm run build` succeeds locally with your `.env.local`.
- [ ] Search for your previous deployment names in `src/` and `index.html`; deployment branding should stay in `VITE_APP_*` env vars.
- [ ] If you changed an adapter migration, you tested it on a throwaway project.
- [ ] If you touched an API adapter, it deploys and the changed endpoint is confirmed with `curl`.
