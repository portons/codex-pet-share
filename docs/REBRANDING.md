# Rebranding your fork

Brand strings are parametrized via four build-time env vars. No source-code edits are needed for a fresh rebrand — set the env vars, rebuild, redeploy.

## The four env vars

All four are required by `scripts/check-public-build-env.mjs`. The build hard-fails until each is set.

| Var | What it controls | Example |
|---|---|---|
| `VITE_APP_NAME` | `<title>`, OG/Twitter `title` + `site_name`, footer brand text, share-image canvas heading, share-text templates ("...on `${APP_NAME}`") | `My Pet Share` |
| `VITE_APP_HANDLE` | Nav wordmark (`$ my-handle`), the `npx <handle> add ...` CLI hint shown next to every pet, share-image canvas badge | `my-handle` (lowercase, hyphenated) |
| `VITE_APP_TAGLINE` | OG/Twitter `description`, default page meta description | `A shareable home for your pixel pets.` |
| `VITE_APP_REPO_URL` | Footer takedown/issue link | `https://github.com/your-org/my-pet-share` |

These are inlined into the bundle at build time via `src/branding/brand.ts` (which reads `import.meta.env.VITE_APP_*`) and via Vite's HTML `%VITE_APP_NAME%` substitution in `index.html`.

## Walkthrough: rebranding a fresh fork

1. **Set the four vars** in your `.env.local`:
   ```bash
   VITE_APP_NAME=My Pet Share
   VITE_APP_HANDLE=my-pets
   VITE_APP_TAGLINE=A shareable home for your pixel pets.
   VITE_APP_REPO_URL=https://github.com/your-org/my-pets
   ```

2. **Replace the static brand assets** in `public/`:
   - `favicon.ico`
   - `assets/petshare-icon.png` (56×56, used in nav)
   - `assets/petshare-mark.webp` (regenerate via `npm run build:nav-mark` if you want a custom wordmark beyond `VITE_APP_HANDLE`)
   - `assets/petshare-social-preview.png` (1200×630, used as the OG image — regenerate after seeding pets via `npm run build:social-card`)

   File names can stay (`petshare-icon.png` is just a filename, not user-visible) — only the contents need to change. Or rename them and update the `<link>` / `<meta>` tags in `index.html` to match.

3. **Update your auth provider email templates**. Change the site name and the email footer so password-reset / signup emails carry your brand instead of provider boilerplate.

4. **Rebuild and redeploy**:
   ```bash
   set -a; source .env.local; set +a
   npm run build
   npx wrangler pages deploy dist --project-name my-pets-app --branch main
   ```

5. **Verify the new brand made it in**:
   ```bash
   grep -E "title|og:" dist/index.html | head
   ```
   Expect your `VITE_APP_NAME` in the title and OG metadata.

## What's NOT parametrized

These weren't worth env-var-izing for the typical fork. If you want to change them, edit the source:

| Asset / string | Where | How |
|---|---|---|
| Color palette (warm cream, rust accent) | `src/app/styles.css` `:root` block | Edit the CSS variables (`--accent`, `--surface`, etc.) |
| Hero copy / about text | `src/app/App.tsx` | Search for the long-form copy and edit. |
| Email templates | Auth provider settings, not source | Edit per-project in Auth settings. |
| Spritesheet aspect ratio (1536×1872, 8 frames × 9 states) | `src/playground/animation/*`, `src/playground/core/config.ts`, and the backend adapter validator | Major refactor — both the renderer and the manifest validator need to agree. Out of scope for a typical rebrand. |

## Existing share-image PNGs in storage

Every uploaded pet has a rendered `share.png` baked at upload time using whatever `APP_NAME` / `APP_HANDLE` were active then. If you rebrand a populated instance:

- New uploads automatically use the new brand.
- Existing share PNGs keep the old brand baked in until you regenerate them.
- The canvas code lives in `src/app/App.tsx` (search for `fillText(APP_NAME` and `fillText(APP_HANDLE`). A one-shot regeneration script isn't shipped — open an issue if you need one.

For a *fresh* fork starting from zero pets, this isn't a concern.

## The CLI tie-in

Every pet page can show an install command shaped like:

```bash
npx <your-handle> add <pet-id>
```

Set `VITE_APP_HANDLE` to the package or project handle you want displayed there. If your fork has no CLI, the command still works as a copyable share string, just not a runnable one.
