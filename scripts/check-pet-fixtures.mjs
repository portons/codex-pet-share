import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const fixtures = [
  {
    label: "legacy v1 gallery pet",
    spritesheet: "test-assets/pets/debug-duck-v1/spritesheet.webp",
    manifest: "test-assets/pets/debug-duck-v1/pet.json",
    version: 1
  },
  {
    label: "Debug Duck v2 upgrade",
    spritesheet: "test-assets/pets/debug-duck-v2/spritesheet.webp",
    manifest: "test-assets/pets/debug-duck-v2/pet.json",
    version: 2
  }
];

for (const fixture of fixtures) {
  const spritesheetPath = path.resolve(fixture.spritesheet);
  const metadata = await sharp(spritesheetPath).metadata();
  const expectedHeight = fixture.version === 2 ? 2288 : 1872;
  if (metadata.width !== 1536 || metadata.height !== expectedHeight || metadata.format !== "webp") {
    throw new Error(`${fixture.label}: expected a 1536x${expectedHeight} WebP, got ${metadata.width}x${metadata.height} ${metadata.format || "unknown"}`);
  }

  if (fixture.manifest) {
    const manifest = JSON.parse(await readFile(path.resolve(fixture.manifest), "utf8"));
    const manifestVersion = manifest.spriteVersionNumber ?? 1;
    if (manifestVersion !== fixture.version) {
      throw new Error(`${fixture.label}: pet.json must resolve to spriteVersionNumber ${fixture.version}`);
    }
    if (manifest.spritesheetPath !== "spritesheet.webp") {
      throw new Error(`${fixture.label}: pet.json must use spritesheet.webp`);
    }
  }

  console.log(`ok - ${fixture.label} (v${fixture.version}, 1536x${expectedHeight})`);
}

const legacyPath = path.resolve(fixtures[0].spritesheet);
const upgradedPath = path.resolve(fixtures[1].spritesheet);
const [legacyPixels, upgradedPixels] = await Promise.all([
  sharp(legacyPath).ensureAlpha().raw().toBuffer(),
  sharp(upgradedPath).ensureAlpha().raw().toBuffer()
]);

const standardFrameCounts = [6, 8, 8, 4, 5, 8, 6, 6, 6];
let visiblePixels = 0;
let visibleColorDifferences = 0;
for (let offset = 0; offset < legacyPixels.length; offset += 4) {
  const pixel = offset / 4;
  const x = pixel % 1536;
  const y = Math.floor(pixel / 1536);
  const row = Math.floor(y / 208);
  const frame = Math.floor(x / 192);
  if (frame >= standardFrameCounts[row]) continue;
  if (legacyPixels[offset + 3] !== upgradedPixels[offset + 3]) {
    throw new Error("Debug Duck v2: used cells in rows 0-8 must preserve every v1 alpha value");
  }
  if (legacyPixels[offset + 3] > 0) {
    visiblePixels += 1;
    if (
      legacyPixels[offset] !== upgradedPixels[offset]
      || legacyPixels[offset + 1] !== upgradedPixels[offset + 1]
      || legacyPixels[offset + 2] !== upgradedPixels[offset + 2]
    ) {
      visibleColorDifferences += 1;
    }
  }
}
const visibleColorDifferenceRatio = visibleColorDifferences / Math.max(visiblePixels, 1);
if (visibleColorDifferenceRatio > 0.1) {
  throw new Error(`Debug Duck v2: used cells in rows 0-8 changed ${(visibleColorDifferenceRatio * 100).toFixed(2)}% of visible v1 colors`);
}
console.log(`ok - Debug Duck v2 preserves used v1 silhouettes exactly (${visibleColorDifferences} edge colors normalized)`);

function visibleCellPixels(row, frame) {
  let count = 0;
  for (let y = row * 208; y < (row + 1) * 208; y += 1) {
    for (let x = frame * 192; x < (frame + 1) * 192; x += 1) {
      if (upgradedPixels[(y * 1536 + x) * 4 + 3] > 0) count += 1;
    }
  }
  return count;
}

if (!visibleCellPixels(0, 6)) {
  throw new Error("Debug Duck v2: dedicated neutral look cell row 0, frame 6 is empty");
}
if (visibleCellPixels(0, 7)) {
  throw new Error("Debug Duck v2: unused row 0, frame 7 must be transparent");
}

for (let row = 9; row <= 10; row += 1) {
  for (let frame = 0; frame < 8; frame += 1) {
    if (!visibleCellPixels(row, frame)) {
      throw new Error(`Debug Duck v2: look cell row ${row}, frame ${frame} is empty`);
    }
  }
}
console.log("ok - Debug Duck v2 contains all 16 non-empty look-direction cells");
