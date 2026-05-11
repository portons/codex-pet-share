import { collectionPets, collectionRow } from "./collections";
import { publicUser } from "./auth";
import { listPets } from "./pets";
import { first } from "../core/db";
import { HttpError, html } from "../core/http";
import { getAssetBytes, petAssetKey } from "../storage/assets";
import type { AppContext, CollectionRow, PetRow, PublicUser } from "../core/types";

const cardWidth = 1200;
const cardHeight = 630;
const previewFrameWidth = 96;
const previewFrameHeight = 104;
const previewStripWidth = 5472;
const previewStripHeight = 104;
const maxPets = 8;
const rendererVersion = "2";

type CollectionOwner = {
  handle: string;
  display_name: string;
  updated_at: string;
};

type SocialPet = {
  id: string;
  displayName: string;
  shareImageUrl: string;
};

export async function handleCollectionSocialImage(ctx: AppContext, slug?: string) {
  if (!slug) return html("<svg xmlns=\"http://www.w3.org/2000/svg\"/>", 404, { "Content-Type": "image/svg+xml; charset=utf-8" });
  const collection = await collectionRow(ctx, slug);
  if (!collection) return html("<svg xmlns=\"http://www.w3.org/2000/svg\"/>", 404, { "Content-Type": "image/svg+xml; charset=utf-8" });
  const owner = collection.owner_id ? await collectionOwner(ctx, collection.owner_id) : null;
  const pets = await collectionPets(ctx, collection.slug, "safe");
  const version = collectionSocialPreviewVersion(ctx, collection, owner, pets);
  const key = collectionSocialPreviewKey(ctx, collection.slug);
  const cached = await ctx.env.PET_ASSETS.get(key);
  if (cached?.customMetadata?.version === version) {
    return socialImageResponse(cached.body, cached.httpEtag, version);
  }
  const svg = await collectionSocialPreviewSvg(ctx, { collection, owner, pets });
  await ctx.env.PET_ASSETS.put(key, svg, {
    httpMetadata: {
      contentType: "image/svg+xml; charset=utf-8",
      cacheControl: "public, max-age=31536000, immutable"
    },
    customMetadata: { version }
  });
  return socialImageResponse(svg, undefined, version);
}

export async function collectionSocialPreviewImageUrl(ctx: AppContext, collection: CollectionRow, pets: PetRow[]) {
  const owner = collection.owner_id ? await collectionOwner(ctx, collection.owner_id) : null;
  const version = collectionSocialPreviewVersion(ctx, collection, owner, pets);
  return `${ctx.url.origin}/api/collections/${encodeURIComponent(collection.slug)}/social-image?v=${encodeURIComponent(version)}`;
}

export async function handleCreatorSocialImage(ctx: AppContext, id?: string) {
  if (!id) return html("<svg xmlns=\"http://www.w3.org/2000/svg\"/>", 404, { "Content-Type": "image/svg+xml; charset=utf-8" });
  const user = await publicUser(ctx, id, null);
  if (!user) return html("<svg xmlns=\"http://www.w3.org/2000/svg\"/>", 404, { "Content-Type": "image/svg+xml; charset=utf-8" });
  const result = await listPets(ctx, "", user.id, [], null, "new", undefined, "safe");
  const version = creatorSocialPreviewVersion(ctx, user, result.pets, result.total);
  const key = creatorSocialPreviewKey(ctx, user.handle || user.id);
  const cached = await ctx.env.PET_ASSETS.get(key);
  if (cached?.customMetadata?.version === version) {
    return socialImageResponse(cached.body, cached.httpEtag, version);
  }
  const svg = await creatorSocialPreviewSvg(ctx, { user, pets: result.pets, petCount: result.total });
  await ctx.env.PET_ASSETS.put(key, svg, {
    httpMetadata: {
      contentType: "image/svg+xml; charset=utf-8",
      cacheControl: "public, max-age=31536000, immutable"
    },
    customMetadata: { version }
  });
  return socialImageResponse(svg, undefined, version);
}

export function creatorSocialPreviewImageUrl(ctx: AppContext, user: PublicUser, pets: SocialPet[], petCount: number) {
  const version = creatorSocialPreviewVersion(ctx, user, pets, petCount);
  return `${ctx.url.origin}/api/users/${encodeURIComponent(user.handle || user.id)}/social-image?v=${encodeURIComponent(version)}`;
}

function socialImageResponse(body: ReadableStream | string, etag: string | undefined, version: string) {
  const headers = new Headers({
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Petshare-Social-Version": version
  });
  if (etag) headers.set("ETag", etag);
  return new Response(body, { headers });
}

function collectionSocialPreviewKey(ctx: AppContext, slug: string) {
  const originKey = ctx.env.PUBLIC_APP_ORIGIN
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/[^a-z0-9.-]+/gi, "_");
  return petAssetKey(ctx, `social/collections/${originKey}/${slug}.svg`);
}

function creatorSocialPreviewKey(ctx: AppContext, handleOrId: string) {
  const originKey = ctx.env.PUBLIC_APP_ORIGIN
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/[^a-z0-9.-]+/gi, "_");
  return petAssetKey(ctx, `social/creators/${originKey}/${handleOrId}.svg`);
}

async function collectionOwner(ctx: AppContext, ownerId: string) {
  const owner = await first<CollectionOwner>(
    ctx.env.DB.prepare("select handle, display_name, updated_at from users where id = ?").bind(ownerId)
  );
  if (!owner) throw new HttpError("collection owner not found", 404);
  return owner;
}

function collectionSocialPreviewVersion(ctx: AppContext, collection: CollectionRow, owner: CollectionOwner | null, pets: PetRow[]) {
  return hashVersion([
    rendererVersion,
    ctx.env.PUBLIC_APP_ORIGIN,
    collection.slug,
    collection.display_name,
    collection.updated_at,
    owner?.handle || "",
    owner?.display_name || "",
    owner?.updated_at || "",
    String(pets.length),
    ...pets.slice(0, maxPets).map((pet) => `${pet.id}:${pet.updated_at}`)
  ].join("|"));
}

function creatorSocialPreviewVersion(ctx: AppContext, user: PublicUser, pets: SocialPet[], petCount: number) {
  return hashVersion([
    rendererVersion,
    ctx.env.PUBLIC_APP_ORIGIN,
    user.id,
    user.handle || "",
    user.displayName,
    String(petCount),
    ...pets.slice(0, maxPets).map((pet) => `${pet.id}:${pet.shareImageUrl}`)
  ].join("|"));
}

async function collectionSocialPreviewSvg(ctx: AppContext, {
  collection,
  owner,
  pets
}: {
  collection: CollectionRow;
  owner: CollectionOwner | null;
  pets: PetRow[];
}) {
  const featuredPets = pets.slice(0, maxPets);
  const titleLines = wrapText(collection.display_name, 24, 2);
  const ownerLabel = owner ? `by ${owner.display_name}` : "curated collection";
  const subtitle = `${ownerLabel} / ${pets.length} ${pets.length === 1 ? "pet" : "pets"}`;
  const collectionUrl = collectionUrlLabel(ctx, collection.slug);
  const petLayers = featuredPets.length ? await petSpriteLayers(ctx, featuredPets) : emptyPetLayer();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">
  <defs>
    <pattern id="paper" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
      <rect width="36" height="36" fill="#f8f6f0"/>
      <rect x="0" y="0" width="18" height="18" fill="#f1eee4"/>
      <rect x="18" y="18" width="18" height="18" fill="#f1eee4"/>
    </pattern>
    <radialGradient id="glow" cx="68%" cy="44%" r="56%">
      <stop offset="0%" stop-color="#d8f25a" stop-opacity="0.30"/>
      <stop offset="70%" stop-color="#d8f25a" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#10100f" flood-opacity="0.20"/>
    </filter>
  </defs>
  <rect width="${cardWidth}" height="${cardHeight}" fill="url(#paper)"/>
  <rect width="${cardWidth}" height="${cardHeight}" fill="url(#glow)"/>
  <rect x="48" y="48" width="${cardWidth - 96}" height="${cardHeight - 96}" rx="22" fill="#fffdf5" stroke="#10100f" stroke-opacity="0.12"/>
  <g transform="translate(92 92)">
    <text x="0" y="0" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="24" font-weight="700" fill="#65a30d" letter-spacing="1">$ ${escapeXml(ctx.env.APP_HANDLE)}</text>
    ${titleLines.map((line, index) => `<text x="0" y="${104 + index * 70}" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="64" font-weight="850" fill="#10100f" letter-spacing="0">${escapeXml(line)}</text>`).join("\n    ")}
    <text x="0" y="${260 + Math.max(titleLines.length - 1, 0) * 70}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="25" font-weight="600" fill="#6f6f69">${escapeXml(subtitle)}</text>
    <text x="0" y="438" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="20" fill="#8b877a">${escapeXml(collectionUrl)}</text>
  </g>
  <g filter="url(#soft-shadow)">
    ${petLayers}
  </g>
</svg>`;
}

async function creatorSocialPreviewSvg(ctx: AppContext, {
  user,
  pets,
  petCount
}: {
  user: PublicUser;
  pets: SocialPet[];
  petCount: number;
}) {
  const featuredPets = pets.slice(0, maxPets);
  const titleLines = wrapText(user.displayName, 24, 2);
  const subtitle = `${petCount} ${petCount === 1 ? "pet" : "pets"} on ${ctx.env.APP_NAME}`;
  const creatorUrl = creatorUrlLabel(ctx, user.handle || user.id);
  const petLayers = featuredPets.length ? await petSpriteLayers(ctx, featuredPets) : emptyPetLayer();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">
  <defs>
    <pattern id="paper" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
      <rect width="36" height="36" fill="#f8f6f0"/>
      <rect x="0" y="0" width="18" height="18" fill="#f1eee4"/>
      <rect x="18" y="18" width="18" height="18" fill="#f1eee4"/>
    </pattern>
    <radialGradient id="glow" cx="68%" cy="44%" r="56%">
      <stop offset="0%" stop-color="#d8f25a" stop-opacity="0.30"/>
      <stop offset="70%" stop-color="#d8f25a" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#10100f" flood-opacity="0.20"/>
    </filter>
  </defs>
  <rect width="${cardWidth}" height="${cardHeight}" fill="url(#paper)"/>
  <rect width="${cardWidth}" height="${cardHeight}" fill="url(#glow)"/>
  <rect x="48" y="48" width="${cardWidth - 96}" height="${cardHeight - 96}" rx="22" fill="#fffdf5" stroke="#10100f" stroke-opacity="0.12"/>
  <g transform="translate(92 92)">
    <text x="0" y="0" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="24" font-weight="700" fill="#65a30d" letter-spacing="1">$ ${escapeXml(ctx.env.APP_HANDLE)}</text>
    ${titleLines.map((line, index) => `<text x="0" y="${104 + index * 70}" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="64" font-weight="850" fill="#10100f" letter-spacing="0">${escapeXml(line)}</text>`).join("\n    ")}
    <text x="0" y="${260 + Math.max(titleLines.length - 1, 0) * 70}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="25" font-weight="600" fill="#6f6f69">${escapeXml(subtitle)}</text>
    <text x="0" y="438" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="20" fill="#8b877a">${escapeXml(creatorUrl)}</text>
  </g>
  <g filter="url(#soft-shadow)">
    ${petLayers}
  </g>
</svg>`;
}

async function petSpriteLayers(ctx: AppContext, pets: Array<{ id: string }>) {
  const layout = socialGridLayout(pets.length);
  const tileWidth = Math.round(previewFrameWidth * layout.scale);
  const tileHeight = Math.round(previewFrameHeight * layout.scale);
  const gridWidth = layout.cols * tileWidth + (layout.cols - 1) * layout.gap;
  const startX = Math.round(cardWidth - gridWidth - 96);
  const layers = await Promise.all(pets.slice(0, layout.cols * layout.rows).map(async (pet, index) => {
    const col = index % layout.cols;
    const row = Math.floor(index / layout.cols);
    const x = startX + col * (tileWidth + layout.gap);
    const y = layout.top + row * (tileHeight + layout.gap);
    const url = `data:image/webp;base64,${bytesToBase64(await getAssetBytes(ctx, `${pet.id}/preview.webp`))}`;
    return `<svg x="${x}" y="${y}" width="${tileWidth}" height="${tileHeight}" viewBox="0 0 ${previewFrameWidth} ${previewFrameHeight}" overflow="hidden">
      <image href="${escapeXml(url)}" x="0" y="0" width="${previewStripWidth}" height="${previewStripHeight}" image-rendering="pixelated"/>
    </svg>`;
  }));
  return layers.join("\n    ");
}

function emptyPetLayer() {
  return `<g transform="translate(740 234)">
    <rect width="300" height="170" rx="18" fill="#f4f2eb" stroke="#d2cec3"/>
    <text x="150" y="88" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="23" fill="#6f6f69">No pets yet</text>
  </g>`;
}

function socialGridLayout(count: number) {
  if (count <= 1) return { cols: 1, rows: 1, scale: 1.75, top: 182, gap: 28 };
  if (count <= 2) return { cols: 2, rows: 1, scale: 1.25, top: 218, gap: 28 };
  if (count <= 4) return { cols: 2, rows: 2, scale: 1.0, top: 142, gap: 24 };
  return { cols: 4, rows: 2, scale: 0.74, top: 168, gap: 18 };
}

function collectionUrlLabel(ctx: AppContext, slug: string) {
  return `${ctx.env.PUBLIC_APP_ORIGIN.replace(/^https?:\/\//, "").replace(/\/$/, "")}/collections/${slug}`;
}

function creatorUrlLabel(ctx: AppContext, handleOrId: string) {
  return `${ctx.env.PUBLIC_APP_ORIGIN.replace(/^https?:\/\//, "").replace(/\/$/, "")}/users/${handleOrId}`;
}

function wrapText(value: string, maxChars: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    let remaining = word;
    while (remaining) {
      const next = current ? `${current} ${remaining}` : remaining;
      if (next.length <= maxChars) {
        current = next;
        break;
      }
      if (current) {
        lines.push(current);
        current = "";
        if (lines.length === maxLines) break;
        continue;
      }
      lines.push(remaining.slice(0, maxChars));
      remaining = remaining.slice(maxChars);
      if (lines.length === maxLines) break;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (!lines.length) return ["Codex Pets"];
  const lastIndex = lines.length - 1;
  if (lines[lastIndex].length > maxChars) {
    lines[lastIndex] = `${lines[lastIndex].slice(0, maxChars - 3)}...`;
  }
  return lines;
}

function hashVersion(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;"
  })[char] || char);
}
