#!/usr/bin/env node
// Generate 1200x630 social preview PNGs for every share surface.
//
//   node scripts/build-entity-cards.mjs           # all three
//   node scripts/build-entity-cards.mjs collections
//   node scripts/build-entity-cards.mjs creators
//   node scripts/build-entity-cards.mjs pets
//
// Output:
//   public/assets/social/collections/<slug>.png
//   public/assets/social/creators/<handle-or-id>.png
//   public/assets/social/pets/<id>.png
//
// Pulls live data from the app API so cards reflect what the catalog looks
// like at build time. Re-run + redeploy when you want to refresh.

import sharp from "sharp";
import { mkdir, readdir, writeFile } from "node:fs/promises";

const APP_NAME = requiredEnv("APP_NAME");
const APP_HANDLE = requiredEnv("APP_HANDLE");

const API_BASE = requiredEnv("APP_API_BASE_URL").replace(/\/$/, "");
const ASSET_PUBLIC_BASE_URL = requiredEnv("ASSET_PUBLIC_BASE_URL").replace(/\/$/, "");

const SPRITE_W = 192;
const SPRITE_H = 208;
const CARD_W = 1200;
const CARD_H = 630;
const GAP = 24;
const STORAGE_BASE = ASSET_PUBLIC_BASE_URL;

const target = (process.argv[2] || "all").toLowerCase();

async function fetchSpriteFrame(petId) {
  const url = `${STORAGE_BASE}/${petId}/spritesheet.webp`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return sharp(buf)
    .extract({ left: 0, top: 0, width: SPRITE_W, height: SPRITE_H })
    .png()
    .toBuffer();
}

function pickSafePets(pets, max = 8) {
  return (pets || [])
    .filter((pet) => !(Array.isArray(pet?.tags) && pet.tags.includes("nsfw")))
    .slice(0, max);
}

async function loadFrames(pets) {
  const frames = [];
  for (const pet of pets) {
    try {
      const frame = await fetchSpriteFrame(pet.id);
      if (frame) {
        frames.push(frame);
      }
    } catch (err) {
      console.warn(`  ! sprite load failed for ${pet.id}: ${err.message}`);
    }
  }
  return frames;
}

function gridLayout(count) {
  if (count <= 1) return { cols: 1, rows: 1, scale: 2, top: 200 };
  if (count <= 2) return { cols: 2, rows: 1, scale: 1.6, top: 200 };
  if (count <= 4) return { cols: count, rows: 1, scale: 1.2, top: 240 };
  if (count <= 6) return { cols: 3, rows: 2, scale: 1.0, top: 168 };
  return { cols: 4, rows: 2, scale: 1.0, top: 168 };
}

async function buildCard({ frames, title, subtitle }) {
  const layout = gridLayout(frames.length);
  const tileW = Math.round(SPRITE_W * layout.scale);
  const tileH = Math.round(SPRITE_H * layout.scale);
  const gridW = layout.cols * tileW + (layout.cols - 1) * GAP;
  const xStart = Math.round((CARD_W - gridW) / 2);

  const composites = [];
  for (let i = 0; i < frames.length && i < layout.cols * layout.rows; i += 1) {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    const x = xStart + col * (tileW + GAP);
    const y = layout.top + row * (tileH + GAP);
    const scaled = await sharp(frames[i]).resize(tileW, tileH, { kernel: "nearest" }).png().toBuffer();
    composites.push({ input: scaled, left: x, top: y });
  }

  const escape = (str) => (str || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);
  const titleSafe = escape(title);
  const subtitleSafe = escape(subtitle);
  const badgeText = APP_HANDLE;
  const badgeCharW = 13;
  const badgePadX = 22;
  const badgeW = badgeText.length * badgeCharW + badgePadX * 2;
  const badgeH = 52;
  const badgeX = Math.round((CARD_W - badgeW) / 2);
  const badgeY = CARD_H - 78;

  const overlaySvg = Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#d8f25a" stop-opacity="0.20"/>
      <stop offset="70%" stop-color="#d8f25a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#glow)"/>
  <text x="${CARD_W / 2}" y="92" text-anchor="middle"
        font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="56" font-weight="800" fill="#10100f" letter-spacing="-1.2">
    ${titleSafe}
  </text>
  <text x="${CARD_W / 2}" y="128" text-anchor="middle"
        font-family="ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, monospace"
        font-size="20" fill="#5f5a4f" letter-spacing="0.4">
    ${subtitleSafe}
  </text>
  <g transform="translate(${badgeX}, ${badgeY})">
    <rect width="${badgeW}" height="${badgeH}" rx="8" fill="#d8f25a" stroke="#10100f" stroke-width="2.5"/>
    <text x="${badgeW / 2}" y="${Math.round(badgeH / 2 + 7)}" text-anchor="middle"
          font-family="ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, monospace"
          font-size="22" font-weight="700" fill="#10100f">
      ${badgeText}
    </text>
  </g>
</svg>`
  );
  composites.push({ input: overlaySvg, left: 0, top: 0 });

  const bg = await sharp({
    create: {
      width: CARD_W,
      height: CARD_H,
      channels: 4,
      background: { r: 248, g: 246, b: 240, alpha: 1 }
    }
  })
    .png()
    .toBuffer();

  return sharp(bg).composite(composites).png({ compressionLevel: 9 }).toBuffer();
}

async function buildCollections() {
  console.log(`Fetching collections from ${API_BASE}/api/collections ...`);
  const res = await fetch(`${API_BASE}/api/collections`);
  if (!res.ok) {
    throw new Error(`collections fetch failed: HTTP ${res.status}`);
  }
  const { collections } = await res.json();
  console.log(`  ${collections.length} collections.`);

  await mkdir("public/assets/social/collections", { recursive: true });

  for (const collection of collections) {
    const safe = pickSafePets(collection.topPets, 8);
    if (safe.length === 0) {
      console.log(`  - skipping ${collection.slug} (no safe pets)`);
      continue;
    }
    const frames = await loadFrames(safe);
    if (frames.length === 0) {
      console.log(`  - skipping ${collection.slug} (no sprites loaded)`);
      continue;
    }
    const png = await buildCard({
      frames,
      title: collection.displayName,
      subtitle: `${collection.petCount} ${collection.petCount === 1 ? "pet" : "pets"} · curated collection`
    });
    const outPath = `public/assets/social/collections/${collection.slug}.png`;
    await writeFile(outPath, png);
    console.log(`  ✓ ${collection.slug} (${png.length.toLocaleString()} bytes, ${frames.length} sprites)`);
  }
}

async function buildCreators() {
  console.log(`Fetching creators from ${API_BASE}/api/creators/leaderboard ...`);
  const res = await fetch(`${API_BASE}/api/creators/leaderboard?limit=200`);
  if (!res.ok) {
    throw new Error(`creators fetch failed: HTTP ${res.status}`);
  }
  const { creators } = await res.json();
  console.log(`  ${creators.length} creators.`);

  await mkdir("public/assets/social/creators", { recursive: true });

  for (const creator of creators) {
    if (!creator.petCount || creator.petCount === 0) continue;
    const handle = creator.handle || creator.id;
    const detailRes = await fetch(`${API_BASE}/api/users/${encodeURIComponent(handle)}/pets?pageSize=8`);
    if (!detailRes.ok) {
      console.log(`  - skipping ${handle} (HTTP ${detailRes.status})`);
      continue;
    }
    const detail = await detailRes.json();
    const safe = pickSafePets(detail.pets, 8);
    if (safe.length === 0) {
      console.log(`  - skipping ${handle} (no safe pets)`);
      continue;
    }
    const frames = await loadFrames(safe);
    if (frames.length === 0) {
      console.log(`  - skipping ${handle} (no sprites)`);
      continue;
    }
    const png = await buildCard({
      frames,
      title: creator.displayName,
      subtitle: `${creator.petCount} ${creator.petCount === 1 ? "pet" : "pets"} on ${APP_NAME}`
    });
    const outPath = `public/assets/social/creators/${handle}.png`;
    await writeFile(outPath, png);
    console.log(`  ✓ ${handle} (${png.length.toLocaleString()} bytes, ${frames.length} sprites)`);
  }
}

if (target === "all" || target === "collections") {
  await buildCollections();
}
if (target === "all" || target === "creators") {
  await buildCreators();
}
if (target === "all" || target === "pets") {
  await buildPets();
}
await writeManifest();
console.log("done.");

async function buildPets() {
  console.log(`Fetching pets from ${API_BASE}/api/pets ...`);
  const pageSize = 60;
  let page = 1;
  const all = [];
  while (true) {
    const res = await fetch(`${API_BASE}/api/pets?page=${page}&pageSize=${pageSize}`);
    if (!res.ok) {
      throw new Error(`pets fetch failed page ${page}: HTTP ${res.status}`);
    }
    const body = await res.json();
    const pets = Array.isArray(body.pets) ? body.pets : [];
    all.push(...pets);
    if (pets.length < pageSize) break;
    page += 1;
  }
  console.log(`  ${all.length} pets total.`);

  await mkdir("public/assets/social/pets", { recursive: true });

  let n = 0;
  for (const pet of all) {
    n += 1;
    if (Array.isArray(pet?.tags) && pet.tags.includes("nsfw")) continue;
    const sprite = await fetchSpriteFrame(pet.id);
    if (!sprite) {
      console.log(`  - ${pet.id} (no sprite)`);
      continue;
    }
    const png = await buildPetCard({ pet, sprite });
    const outPath = `public/assets/social/pets/${pet.id}.png`;
    await writeFile(outPath, png);
    if (n % 25 === 0 || n === all.length) {
      console.log(`  ${n}/${all.length} (${pet.id}, ${png.length.toLocaleString()} bytes)`);
    }
  }
}

async function buildPetCard({ pet, sprite }) {
  // Mirror the client-side canvas in src/uploads/uploadAssets.ts (generateShareImage) but
  // replicate it server-side so we control the wordmark and brand.
  const escape = (str) => (str || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);
  const titleSafe = escape(pet.displayName || pet.id);
  const descLines = wrap(pet.description || "", 36, 2);
  const badgeText = APP_HANDLE;
  const badgeCharW = 13;
  const badgePadX = 22;
  const badgeW = badgeText.length * badgeCharW + badgePadX * 2;
  const badgeH = 52;

  // Scaled-up sprite (1.8x = ~346x374) on the right.
  const spriteW = Math.round(SPRITE_W * 1.8);
  const spriteH = Math.round(SPRITE_H * 1.8);
  const spriteX = CARD_W - spriteW - 80;
  const spriteY = Math.round((CARD_H - spriteH) / 2);
  const spriteScaled = await sharp(sprite).resize(spriteW, spriteH, { kernel: "nearest" }).png().toBuffer();

  const overlaySvg = Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="32" height="32" fill="#e5dec6"/>
      <rect x="0" y="0" width="16" height="16" fill="#f5f0dc"/>
      <rect x="16" y="16" width="16" height="16" fill="#f5f0dc"/>
    </pattern>
  </defs>
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#dots)"/>
  <text x="72" y="92" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="34" font-weight="700" fill="#10100f">${escape(APP_NAME)}</text>
  <text x="72" y="218" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="78" font-weight="800" fill="#10100f" letter-spacing="-1.5">${titleSafe}</text>
  ${descLines.map((line, i) => `<text x="72" y="${300 + i * 42}" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="28" font-weight="500" fill="#5f5a4f">${escape(line)}</text>`).join("\n  ")}
  <g transform="translate(72, ${CARD_H - 110})">
    <rect width="${badgeW}" height="${badgeH}" rx="8" fill="#d8f25a" stroke="#10100f" stroke-width="2.5"/>
    <text x="${badgeW / 2}" y="${Math.round(badgeH / 2 + 7)}" text-anchor="middle"
          font-family="ui-monospace, 'SF Mono', Menlo, monospace"
          font-size="22" font-weight="700" fill="#10100f">${badgeText}</text>
  </g>
</svg>`
  );

  const bg = await sharp({
    create: {
      width: CARD_W,
      height: CARD_H,
      channels: 4,
      background: { r: 245, g: 240, b: 220, alpha: 1 }
    }
  })
    .png()
    .toBuffer();

  return sharp(bg)
    .composite([
      { input: overlaySvg, left: 0, top: 0 },
      { input: spriteScaled, left: spriteX, top: spriteY }
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function wrap(str, perLine, maxLines) {
  const words = String(str || "").trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > perLine && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) {
    lines.push(current);
  }
  if (lines.length === maxLines && current && lines[maxLines - 1] !== current) {
    const last = lines[maxLines - 1];
    if (last.length > perLine - 1) {
      lines[maxLines - 1] = last.slice(0, perLine - 1) + "…";
    }
  }
  return lines.length ? lines : [""];
}

async function writeManifest() {
  const collections = (await readdir("public/assets/social/collections").catch(() => []))
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.slice(0, -4))
    .sort();
  const creators = (await readdir("public/assets/social/creators").catch(() => []))
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.slice(0, -4))
    .sort();
  const pets = (await readdir("public/assets/social/pets").catch(() => []))
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.slice(0, -4))
    .sort();
  const version = String(Math.floor(Date.now() / 1000));
  const out = `// Auto-generated by scripts/build-entity-cards.mjs. Do not edit by hand.
export const collections = new Set(${JSON.stringify(collections)});
export const creators = new Set(${JSON.stringify(creators)});
export const pets = new Set(${JSON.stringify(pets)});
export const version = ${JSON.stringify(version)};
`;
  await writeFile("adapters/cloudflare-pages/functions/_social-manifest.js", out);
  console.log(`manifest: ${collections.length} collections, ${creators.length} creators, ${pets.length} pets (v${version})`);
}

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    console.error(`${name} is required for build-entity-cards.`);
    process.exit(1);
  }
  return value;
}
