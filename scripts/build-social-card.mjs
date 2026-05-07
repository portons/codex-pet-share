#!/usr/bin/env node
// Generate public/assets/petshare-social-preview.png — a 1200x630 social card
// showing a 4x2 grid of featured pet sprites + brand text. Run on demand:
//   npm run build:social-card
//
// Pulls sprites direct from the configured public asset base so the card
// reflects the live look of the catalog. Pets are picked manually below;
// swap them when you want a different lineup.

import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const APP_NAME = requiredEnv("APP_NAME");
const APP_TAGLINE = requiredEnv("APP_TAGLINE");

const FEATURED = [
  "kid-goku",
  "soda",
  "naruto",
  "snorty",
  "xika",
  "frieren",
  "rick",
  "cedric-coder"
];

const SPRITE_W = 192;
const SPRITE_H = 208;
const COLS = 4;
const CARD_W = 1200;
const CARD_H = 630;
const TILE_GAP = 28;
const ROW_TOP = 64;

const ASSET_PUBLIC_BASE_URL = (process.env.ASSET_PUBLIC_BASE_URL || "").replace(/\/$/, "");
if (!ASSET_PUBLIC_BASE_URL) {
  console.error("ASSET_PUBLIC_BASE_URL is required for build-social-card.");
  process.exit(1);
}
const STORAGE_BASE = ASSET_PUBLIC_BASE_URL;

async function fetchSprite(id) {
  const url = `${STORAGE_BASE}/${id}/spritesheet.webp`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetch failed for ${id}: HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function spriteIdleFrame(spritesheetBuf) {
  // Crop the idle (row 0, frame 0) cell at (0, 0) -> 192 x 208
  return sharp(spritesheetBuf)
    .extract({ left: 0, top: 0, width: SPRITE_W, height: SPRITE_H })
    .png()
    .toBuffer();
}

async function build() {
  console.log(`Fetching ${FEATURED.length} sprites...`);
  const sprites = await Promise.all(
    FEATURED.map(async (id) => {
      const sheet = await fetchSprite(id);
      const frame = await spriteIdleFrame(sheet);
      console.log(`  ✓ ${id}`);
      return { id, frame };
    })
  );

  // Compute centered grid layout (4 cols x 2 rows)
  const gridW = COLS * SPRITE_W + (COLS - 1) * TILE_GAP;
  const xStart = Math.round((CARD_W - gridW) / 2);

  const composites = [];
  for (let i = 0; i < sprites.length; i += 1) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = xStart + col * (SPRITE_W + TILE_GAP);
    const y = ROW_TOP + row * (SPRITE_H + TILE_GAP);
    composites.push({ input: sprites[i].frame, left: x, top: y });
  }

  // Title overlay (SVG -> raster). Positioned bottom-left so it doesn't
  // collide with the bottom row of sprites.
  const titleSvg = Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#d8f25a" stop-opacity="0.22"/>
      <stop offset="70%" stop-color="#d8f25a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#glow)"/>
  <text x="${CARD_W / 2}" y="${CARD_H - 60}" text-anchor="middle"
        font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="44" font-weight="700" fill="#1f1d1a" letter-spacing="-0.5">
    ${escapeSvg(APP_NAME)}
  </text>
  <text x="${CARD_W / 2}" y="${CARD_H - 26}" text-anchor="middle"
        font-family="ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, monospace"
        font-size="18" fill="#6b6863" letter-spacing="0.3">
    ${escapeSvg(APP_TAGLINE)}
  </text>
</svg>`
  );
  composites.push({ input: titleSvg, left: 0, top: 0 });

  // Warm cream background (matches the app surface)
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

  const out = await sharp(bg)
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile("public/assets/petshare-social-preview.png", out);
  console.log(`\nWrote public/assets/petshare-social-preview.png (${out.length.toLocaleString()} bytes, ${CARD_W}x${CARD_H})`);
}

await build();

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    console.error(`${name} is required for build-social-card.`);
    process.exit(1);
  }
  return value;
}

function escapeSvg(value) {
  return String(value).replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[char]);
}
