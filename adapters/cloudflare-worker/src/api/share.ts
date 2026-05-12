import { collectionPets, collectionRow } from "./collections";
import { currentUser, publicUser } from "./auth";
import { getVisiblePet, listPets } from "./pets";
import { slugPattern } from "./constants";
import { collectionSocialPreviewImageUrl, creatorSocialPreviewImageUrl } from "./socialPreview";
import { escapeHtml, html } from "../core/http";
import { petAssetUrl } from "../storage/assets";
import type { AppContext } from "../core/types";

export async function handleSharePet(ctx: AppContext, petId?: string) {
  if (!petId || !slugPattern.test(petId)) return html("<!doctype html><title>Pet not found</title><p>Pet not found.</p>", 404);
  const pet = await getVisiblePet(ctx, petId, null);
  if (!pet) return html("<!doctype html><title>Pet not found</title><p>Pet not found.</p>", 404);
  const version = String(Date.parse(pet.updated_at || pet.created_at));
  const title = `${pet.display_name} - ${ctx.env.APP_NAME}`;
  const creator = pet.owner_display_name || (pet.source === "seed" ? "Local package" : "Anonymous");
  const nsfw = JSON.parse(pet.tags_json).includes("nsfw");
  return entityHtml(ctx, {
    title,
    description: `${nsfw ? "NSFW. " : ""}${pet.description} by ${creator}`,
    canonical: `${ctx.env.PUBLIC_APP_ORIGIN}/#/pets/${pet.id}`,
    shareUrl: `${ctx.env.PUBLIC_APP_ORIGIN}/share/${pet.id}`,
    image: nsfw ? `${ctx.env.PUBLIC_APP_ORIGIN}/assets/petshare-logo.png` : petAssetUrl(ctx, `${pet.id}/share.png`, version),
    imageAlt: `${pet.display_name} preview`,
    imageType: "image/png",
    body: `<h1>${escapeHtml(pet.display_name)}</h1><p>${escapeHtml(pet.description)}</p><p>${nsfw ? "NSFW · " : ""}by ${escapeHtml(creator)}</p>`
  });
}

export async function handleEntityShare(ctx: AppContext, kind: "collections" | "users" | "gallery", id?: string) {
  const viewer = await currentUser(ctx);
  if (kind === "gallery") {
    const pets = await listPets(ctx, "", undefined, [], viewer, "popular", { page: 1, pageSize: 3 }, "safe");
    return entityHtml(ctx, {
      title: `${ctx.env.APP_NAME} gallery`,
      description: ctx.env.APP_TAGLINE,
      canonical: `${ctx.env.PUBLIC_APP_ORIGIN}/#/gallery`,
      shareUrl: `${ctx.env.PUBLIC_APP_ORIGIN}/gallery/popular`,
      image: `${ctx.env.PUBLIC_APP_ORIGIN}/assets/petshare-social-preview.png`,
      imageAlt: `${ctx.env.APP_NAME} gallery preview`,
      imageType: "image/png",
      body: `<h1>${escapeHtml(ctx.env.APP_NAME)}</h1><p>${escapeHtml(ctx.env.APP_TAGLINE)}</p><p>${pets.total} pets</p>`
    });
  }
  if (kind === "collections" && id) {
    const collection = await collectionRow(ctx, id);
    if (!collection) return html("<!doctype html><title>Collection not found</title>", 404);
    const pets = await collectionPets(ctx, collection.slug, "safe");
    const image = await collectionSocialPreviewImageUrl(ctx, collection, pets);
    return entityHtml(ctx, {
      title: collection.display_name,
      description: `${pets.length} pets in ${ctx.env.APP_NAME}`,
      canonical: `${ctx.env.PUBLIC_APP_ORIGIN}/#/collections/${collection.slug}`,
      shareUrl: `${ctx.env.PUBLIC_APP_ORIGIN}/collections/${collection.slug}`,
      image,
      imageAlt: `${collection.display_name} collection preview`,
      imageType: "image/svg+xml",
      body: `<h1>${escapeHtml(collection.display_name)}</h1><p>${pets.length} pets</p>`
    });
  }
  if (kind === "users" && id) {
    const user = await publicUser(ctx, id, viewer);
    if (!user) return html("<!doctype html><title>Creator not found</title><p>Creator not found.</p>", 404);
    const result = await listPets(ctx, "", user.id, [], viewer, "new", undefined, "safe");
    const previewPets = result.pets.slice(0, 4);
    const title = `${user.displayName} - ${ctx.env.APP_NAME}`;
    const description = creatorDescription(user.displayName, previewPets, result.total, ctx.env.APP_NAME);
    const handleOrId = user.handle || user.id;
    const image = creatorSocialPreviewImageUrl(ctx, user, result.pets, result.total);
    return entityHtml(ctx, {
      title,
      description,
      canonical: `${ctx.env.PUBLIC_APP_ORIGIN}/#/users/${handleOrId}`,
      shareUrl: `${ctx.env.PUBLIC_APP_ORIGIN}/users/${handleOrId}`,
      image,
      imageAlt: `${user.displayName} creator preview`,
      imageType: "image/svg+xml",
      body: `<h1>${escapeHtml(user.displayName)}</h1><p>${escapeHtml(description)}</p>`
    });
  }
  return html("<!doctype html><title>Not found</title>", 404);
}

function creatorDescription(displayName: string, pets: Array<{ displayName: string }>, petCount: number, appName: string) {
  if (petCount <= 0 || pets.length === 0) return `${displayName} hasn't shared a pet yet.`;
  if (petCount === 1 && pets[0]) return `${displayName} made ${pets[0].displayName}, a pixel pet for ${appName}.`;
  if (pets.length >= 2 && petCount >= 2) {
    const remaining = petCount - 2;
    if (remaining <= 0) return `${displayName} made ${pets[0].displayName} and ${pets[1].displayName} for ${appName}.`;
    return `${displayName} made ${pets[0].displayName}, ${pets[1].displayName}, and ${remaining} more pixel pet${remaining === 1 ? "" : "s"} for ${appName}.`;
  }
  const remaining = Math.max(petCount - 1, 0);
  return `${displayName} made ${pets[0].displayName} and ${remaining} more pixel pet${remaining === 1 ? "" : "s"} for ${appName}.`;
}

function entityHtml(ctx: AppContext, input: {
  title: string;
  description: string;
  canonical: string;
  shareUrl: string;
  image: string;
  imageAlt: string;
  imageType: string;
  body: string;
}) {
  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(input.title)}</title>
  <link rel="canonical" href="${escapeHtml(input.canonical)}">
  <meta name="description" content="${escapeHtml(input.description)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(ctx.env.APP_NAME)}">
  <meta property="og:title" content="${escapeHtml(input.title)}">
  <meta property="og:description" content="${escapeHtml(input.description)}">
  <meta property="og:image" content="${escapeHtml(input.image)}">
  <meta property="og:image:secure_url" content="${escapeHtml(input.image)}">
  <meta property="og:image:type" content="${escapeHtml(input.imageType)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(input.imageAlt)}">
  <meta property="og:url" content="${escapeHtml(input.shareUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(input.title)}">
  <meta name="twitter:description" content="${escapeHtml(input.description)}">
  <meta name="twitter:image" content="${escapeHtml(input.image)}">
  <meta name="twitter:image:alt" content="${escapeHtml(input.imageAlt)}">
  <style>
    :root {
      color-scheme: light;
      --ink: #161512;
      --muted: #746f65;
      --line: #ddd5c4;
      --panel: #f6f0df;
      --accent: #6e941f;
      --accent-dark: #38530d;
    }
    * {
      box-sizing: border-box;
    }
    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      color: var(--ink);
      background:
        linear-gradient(rgba(255, 253, 247, 0.78), rgba(255, 253, 247, 0.78)),
        radial-gradient(circle at 18% 20%, rgba(202, 224, 138, 0.38), transparent 34%),
        radial-gradient(circle at 82% 78%, rgba(235, 191, 110, 0.28), transparent 30%),
        var(--panel);
      font-family: "Cabinet Grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    a {
      color: inherit;
    }
    .shareShell {
      width: min(960px, 100%);
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 253, 247, 0.86);
      box-shadow: 0 28px 80px rgba(45, 38, 23, 0.16);
    }
    .sharePanel {
      display: grid;
      grid-template-columns: minmax(0, 1.08fr) minmax(280px, 0.92fr);
      gap: 18px;
      align-items: stretch;
    }
    .shareImage {
      width: 100%;
      height: auto;
      min-height: 360px;
      display: block;
      object-fit: contain;
      border: 1px solid var(--line);
      border-radius: 8px;
      background:
        linear-gradient(45deg, rgba(142, 132, 104, 0.12) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(142, 132, 104, 0.12) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(142, 132, 104, 0.12) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(142, 132, 104, 0.12) 75%),
        #f6f0df;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0;
      background-size: 24px 24px;
    }
    .shareCopy {
      min-height: 360px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: clamp(22px, 5vw, 48px);
      border: 1px dashed var(--line);
      border-radius: 8px;
      background: linear-gradient(180deg, #fffaf0, #f7efd9);
    }
    .shareCopy h1 {
      margin: 0 0 14px;
      font-size: 64px;
      line-height: 0.92;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }
    .shareCopy p {
      max-width: 38rem;
      margin: 0 0 14px;
      color: var(--muted);
      font-size: 18px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .shareCopy p:last-of-type {
      margin-bottom: 28px;
      color: var(--ink);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 12px;
    }
    .shareCta {
      width: fit-content;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-height: 46px;
      padding: 0 18px;
      border: 1px solid #86a83b;
      border-radius: 10px;
      background: #e5f6b7;
      color: var(--accent-dark);
      box-shadow: inset 0 -2px 0 rgba(56, 83, 13, 0.13);
      font-weight: 800;
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      font-size: 13px;
    }
    .shareCta:hover,
    .shareCta:focus-visible {
      background: #d9f09d;
      border-color: var(--accent);
      outline: none;
    }
    .shareMeta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      color: var(--muted);
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    @media (max-width: 760px) {
      body {
        padding: 12px;
      }
      .shareShell {
        padding: 12px;
      }
      .sharePanel {
        grid-template-columns: 1fr;
      }
      .shareImage {
        min-height: 0;
        aspect-ratio: 1200 / 630;
      }
      .shareCopy {
        min-height: 0;
      }
      .shareMeta {
        flex-direction: column;
      }
      .shareCopy h1 {
        font-size: 42px;
      }
      .shareCopy p {
        font-size: 16px;
      }
    }
  </style>
</head>
<body>
  <main class="shareShell">
    <div class="shareMeta">
      <span>${escapeHtml(ctx.env.APP_NAME)}</span>
      <span>Share page</span>
    </div>
    <section class="sharePanel" aria-label="${escapeHtml(input.title)}">
      <img class="shareImage" src="${escapeHtml(input.image)}" alt="${escapeHtml(input.imageAlt)}">
      <div class="shareCopy">
        ${input.body}
        <a class="shareCta" href="${escapeHtml(input.canonical)}">Open in ${escapeHtml(ctx.env.APP_NAME)}</a>
      </div>
    </section>
  </main>
</body>
</html>`);
}
