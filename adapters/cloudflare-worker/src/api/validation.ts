import { HttpError } from "../core/http";
import type { PetKind, ValidationReport } from "../core/types";
import { allowedPetKinds } from "./constants";

export type Manifest = {
  id: string;
  displayName: string;
  description: string;
  spritesheetPath: "spritesheet.webp";
  kind?: PetKind;
};

const atlas = { width: 1536, height: 1872 };
const cell = { width: 192, height: 208 };
const stateCount = 9;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateManifest(value: unknown): Manifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("pet.json must be a JSON object", 400);
  }
  const input = value as Record<string, unknown>;
  const id = normalizePetSlug(String(input.id || ""));
  const displayName = String(input.displayName || "").trim();
  const description = String(input.description || "").trim();
  const spritesheetPath = String(input.spritesheetPath || "");
  const kind = input.kind === undefined ? undefined : parsePetKind(input.kind);
  if (!slugPattern.test(id)) throw new HttpError("pet.json id must contain letters or numbers", 400);
  if (!displayName || displayName.length > 80) throw new HttpError("pet.json displayName is required", 400);
  if (!description || description.length > 280) throw new HttpError("pet.json description is required", 400);
  if (spritesheetPath !== "spritesheet.webp") throw new HttpError("pet.json spritesheetPath must be spritesheet.webp", 400);
  return { id, displayName, description, spritesheetPath, kind };
}

export function normalizePetSlug(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function parsePetKind(value: unknown): PetKind {
  if (typeof value !== "string" || !allowedPetKinds.includes(value as PetKind)) {
    throw new HttpError("invalid pet kind", 400);
  }
  return value as PetKind;
}

export function parseJson(value: string, name: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new HttpError(`${name} must be valid JSON`, 400);
  }
}

export function validateSpritesheet(bytes: Uint8Array) {
  const size = webpSize(bytes);
  if (size.width !== atlas.width || size.height !== atlas.height) {
    throw new HttpError(`spritesheet must be ${atlas.width}x${atlas.height}`, 400);
  }
}

export function validateShareImage(bytes: Uint8Array) {
  const size = pngSize(bytes);
  if (size.width !== 1200 || size.height !== 630) throw new HttpError("share.png must be 1200x630", 400);
}

export function validatePreviewImage(bytes: Uint8Array) {
  const size = webpSize(bytes);
  if (size.width !== 5472 || size.height !== 104) throw new HttpError("preview.webp must be 5472x104", 400);
}

export function validationFromBytes(manifest: Manifest, spritesheet: Uint8Array): ValidationReport {
  const size = webpSize(spritesheet);
  return {
    manifestId: manifest.id,
    atlasSize: `${size.width}x${size.height}`,
    cellSize: `${cell.width}x${cell.height}`,
    statesDetected: stateCount,
    manifestBytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2) + "\n").length,
    spritesheetBytes: spritesheet.length
  };
}

function webpSize(bytes: Uint8Array) {
  if (text(bytes, 0, 4) !== "RIFF" || text(bytes, 8, 12) !== "WEBP") throw new HttpError("spritesheet must be a WebP file", 400);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunk = text(bytes, offset, offset + 4);
    const length = readU32(bytes, offset + 4);
    const data = offset + 8;
    if (chunk === "VP8X" && length >= 10) return { width: 1 + readU24(bytes, data + 4), height: 1 + readU24(bytes, data + 7) };
    if (chunk === "VP8 " && length >= 10) return { width: readU16(bytes, data + 6) & 0x3fff, height: readU16(bytes, data + 8) & 0x3fff };
    if (chunk === "VP8L" && length >= 5 && bytes[data] === 0x2f) {
      return { width: 1 + (((bytes[data + 2] & 0x3f) << 8) | bytes[data + 1]), height: 1 + (((bytes[data + 4] & 0x0f) << 10) | (bytes[data + 3] << 2) | ((bytes[data + 2] & 0xc0) >> 6)) };
    }
    offset = data + length + (length % 2);
  }
  throw new HttpError("spritesheet dimensions could not be read", 400);
}

function pngSize(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((byte, index) => bytes[index] !== byte) || text(bytes, 12, 16) !== "IHDR") {
    throw new HttpError("share.png must be a PNG file", 400);
  }
  return { width: readU32BE(bytes, 16), height: readU32BE(bytes, 20) };
}

function text(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function readU16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes: Uint8Array, offset: number) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function readU32BE(bytes: Uint8Array, offset: number) {
  return (((bytes[offset] << 24) >>> 0) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function readU24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}
