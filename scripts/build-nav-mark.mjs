#!/usr/bin/env node
// Generate public/assets/petshare-mark.webp -- a sharp 96x96 nav-bar
// mark resampled from the 1024x1024 petshare-icon.png. The existing
// petshare-logo-nav.webp was too low-resolution to display cleanly at
// 32-40px without visible blur. Run on demand:
//   npm run build:nav-mark

import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const SRC = "public/assets/petshare-icon.png";
const OUT = "public/assets/petshare-mark.webp";
const SIZE = 96; // 3x for crisp display at ~32px header size on retina

const buf = await sharp(SRC)
  .resize(SIZE, SIZE, { fit: "cover", kernel: "lanczos3" })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toBuffer();

await writeFile(OUT, buf);
console.log(`Wrote ${OUT} (${buf.length.toLocaleString()} bytes, ${SIZE}x${SIZE})`);
