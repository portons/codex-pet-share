import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import sharp from "sharp";

const origin = argValue("--origin") || process.env.PUBLIC_APP_ORIGIN || "https://codex-pets.net";
const bucket = argValue("--bucket") || process.env.R2_BUCKET || "codex-pets-assets";
const prefix = argValue("--prefix") || process.env.PET_BUCKET_PREFIX || process.env.PET_BUCKET || "pets";
const outputDir = argValue("--output") || "tmp/poster-backfill";
const limit = Number(argValue("--limit") || 0);
const concurrency = Number(argValue("--concurrency") || 4);
const dryRun = process.argv.includes("--dry-run");

if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
  throw new Error("--concurrency must be a positive integer.");
}

await mkdir(outputDir, { recursive: true });

const pets = limit > 0 ? (await listPets()).slice(0, limit) : await listPets();
let generated = 0;
let skipped = 0;
let uploaded = 0;

await runQueue(pets, concurrency, async (pet, index) => {
  const posterUrl = posterUrlFor(pet.spritesheetUrl);
  if (await assetExists(posterUrl)) {
    skipped += 1;
    progress(index + 1, pets.length, pet.id, "exists");
    return;
  }

  const spritesheet = Buffer.from(await fetchBytes(pet.spritesheetUrl));
  const poster = await sharp(spritesheet)
    .extract({ left: 0, top: 0, width: 192, height: 208 })
    .webp({ lossless: true, effort: 4 })
    .toBuffer();

  const posterPath = path.join(outputDir, `${pet.id}.webp`);
  await writeFile(posterPath, poster);
  generated += 1;

  if (!dryRun) {
    await putR2Object(`${bucket}/${prefix}/${pet.id}/poster.webp`, posterPath);
    uploaded += 1;
  }
  progress(index + 1, pets.length, pet.id, dryRun ? "generated" : "uploaded");
});

console.log(JSON.stringify({ pets: pets.length, generated, uploaded, skipped, dryRun }, null, 2));

async function listPets() {
  const out = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const url = new URL("/api/pets", origin);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", "60");
    url.searchParams.set("content", "all");
    const body = await fetchJson(url);
    out.push(...body.pets);
    totalPages = body.totalPages;
    page += 1;
  }
  return out;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }
  return response.json();
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }
  return response.arrayBuffer();
}

async function assetExists(url) {
  const response = await fetch(url, { method: "HEAD" });
  return response.ok;
}

function posterUrlFor(spritesheetUrl) {
  const url = new URL(spritesheetUrl);
  url.pathname = url.pathname.replace(/\/spritesheet\.webp$/, "/poster.webp");
  return url.toString();
}

function putR2Object(objectPath, filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", [
      "wrangler",
      "r2",
      "object",
      "put",
      objectPath,
      "--file",
      filePath,
      "--content-type",
      "image/webp",
      "--cache-control",
      "public, max-age=31536000, immutable",
      "--remote",
      "--force"
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`wrangler r2 object put failed for ${objectPath}\n${output}`));
      }
    });
  });
}

async function runQueue(items, width, task) {
  let next = 0;
  const workers = Array.from({ length: Math.min(width, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await task(items[index], index);
    }
  });
  await Promise.all(workers);
}

function progress(done, total, id, state) {
  if (done === total || done % 25 === 0) {
    console.log(`${done}/${total} ${state} ${id}`);
  }
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}
