import { collectionPets, collectionRow } from "./collections";
import { currentUser, publicUser } from "./auth";
import { getVisiblePet, listPets } from "./pets";
import { slugPattern } from "./constants";
import { collectionSocialPreviewImageUrl } from "./socialPreview";
import { escapeHtml, html } from "../core/http";
import { petAssetUrl } from "../storage/assets";
import type { AppContext, Viewer } from "../core/types";

export async function handleSharePet(ctx: AppContext, petId?: string) {
  if (!petId || !slugPattern.test(petId)) return html("<!doctype html><title>Pet not found</title><p>Pet not found.</p>", 404);
  const pet = await getVisiblePet(ctx, petId, null);
  if (!pet) return html("<!doctype html><title>Pet not found</title><p>Pet not found.</p>", 404);
  const version = String(Date.parse(pet.updated_at || pet.created_at));
  const title = `${pet.display_name} - ${ctx.env.APP_NAME}`;
  const creator = pet.owner_display_name || (pet.source === "seed" ? "Local package" : "Unknown");
  const nsfw = JSON.parse(pet.tags_json).includes("nsfw");
  return entityHtml(ctx, {
    title,
    description: `${nsfw ? "NSFW. " : ""}${pet.description} by ${creator}`,
    canonical: `${ctx.env.PUBLIC_APP_ORIGIN}/#/pets/${pet.id}`,
    shareUrl: `${ctx.env.PUBLIC_APP_ORIGIN}/share/${pet.id}`,
    image: nsfw ? `${ctx.env.PUBLIC_APP_ORIGIN}/assets/petshare-logo.png` : petAssetUrl(ctx, `${pet.id}/share.png`, version),
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
      body: `<h1>${escapeHtml(collection.display_name)}</h1><p>${pets.length} pets</p>`
    });
  }
  if (kind === "users" && id) {
    const user = await publicUser(ctx, id, viewer);
    if (!user) return html("<!doctype html><title>Creator not found</title><p>Creator not found.</p>", 404);
    const result = await listPets(ctx, "", user.id, [], viewer, "new", { page: 1, pageSize: 4 }, "safe");
    const stats = await creatorStats(ctx, user.id, viewer);
    const featured = result.pets[0] || null;
    const title = `${user.displayName} - ${ctx.env.APP_NAME}`;
    const description = creatorDescription(user.displayName, result.pets, stats.petCount, ctx.env.APP_NAME);
    const handleOrId = user.handle || user.id;
    const image = featured ? `${ctx.url.origin}/api/pets/${featured.id}/share-image` : `${ctx.env.PUBLIC_APP_ORIGIN}/assets/petshare-social-preview.png`;
    return entityHtml(ctx, {
      title,
      description,
      canonical: `${ctx.env.PUBLIC_APP_ORIGIN}/#/users/${handleOrId}`,
      shareUrl: `${ctx.env.PUBLIC_APP_ORIGIN}/users/${handleOrId}`,
      image,
      body: `<h1>${escapeHtml(user.displayName)}</h1><p>${escapeHtml(description)}</p>`
    });
  }
  return html("<!doctype html><title>Not found</title>", 404);
}

async function creatorStats(ctx: AppContext, ownerId: string, viewer: Viewer) {
  const result = await listPets(ctx, "", ownerId, [], viewer, "new", undefined, "safe");
  return {
    petCount: result.total,
    viewCount: result.pets.reduce((total, pet) => total + pet.viewCount, 0),
    likeCount: result.pets.reduce((total, pet) => total + pet.likeCount, 0)
  };
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

function entityHtml(ctx: AppContext, input: { title: string; description: string; canonical: string; shareUrl: string; image: string; body: string }) {
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
  <meta property="og:url" content="${escapeHtml(input.shareUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(input.title)}">
  <meta name="twitter:description" content="${escapeHtml(input.description)}">
  <meta name="twitter:image" content="${escapeHtml(input.image)}">
</head>
<body><main>${input.body}<p><a href="${escapeHtml(input.canonical)}">Open in ${escapeHtml(ctx.env.APP_NAME)}</a></p></main></body>
</html>`);
}
