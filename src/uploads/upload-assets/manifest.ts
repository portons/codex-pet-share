import {
  isEditablePetKind,
  isPetSpriteVersion,
  spriteAtlasRows,
  spriteSheetHeight,
  spriteSheetWidth
} from "../../domain/config";
import type { EditablePetKind, PetSpriteVersion, UploadManifest } from "../../domain/types";

export async function readUploadManifest(file: File): Promise<UploadManifest> {
  let value: Record<string, unknown>;
  try {
    const parsed = JSON.parse(await file.text()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error();
    }
    value = parsed as Record<string, unknown>;
  } catch {
    throw new Error("pet.json must be valid JSON");
  }
  const rawSpriteVersion = value.spriteVersionNumber;
  if (rawSpriteVersion !== undefined && rawSpriteVersion !== 2) {
    throw new Error("pet.json spriteVersionNumber must be 2 when provided");
  }
  return {
    id: String(value.id || ""),
    displayName: String(value.displayName || ""),
    description: String(value.description || ""),
    spritesheetPath: String(value.spritesheetPath || ""),
    ...(rawSpriteVersion === 2 ? { spriteVersionNumber: 2 as const } : {}),
    kind: isEditablePetKind(String(value.kind || "")) ? String(value.kind) as EditablePetKind : undefined
  };
}

export async function readSpritesheetVersion(file: File): Promise<PetSpriteVersion> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;
    await image.decode();
    if (image.naturalWidth !== spriteSheetWidth) {
      throw new Error(`spritesheet must be ${spriteSheetWidth}px wide`);
    }
    const version = (Object.keys(spriteAtlasRows) as Array<`${PetSpriteVersion}`>)
      .map(Number)
      .find((candidate) => image.naturalHeight === spriteSheetHeight(candidate as PetSpriteVersion));
    if (!isPetSpriteVersion(version)) {
      throw new Error(`spritesheet must be ${spriteSheetWidth}x${spriteSheetHeight(1)} (v1) or ${spriteSheetWidth}x${spriteSheetHeight(2)} (v2)`);
    }
    return version;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function validateManifestSpriteVersion(manifest: UploadManifest, spritesheetVersion: PetSpriteVersion) {
  const manifestVersion: PetSpriteVersion = manifest.spriteVersionNumber === 2 ? 2 : 1;
  if (manifestVersion !== spritesheetVersion) {
    throw new Error(spritesheetVersion === 2
      ? "v2 spritesheets require spriteVersionNumber: 2 in pet.json"
      : "spriteVersionNumber: 2 requires a 1536x2288 spritesheet");
  }
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

export function normalizeUploadManifest(manifest: UploadManifest): UploadManifest {
  const id = normalizePetSlug(manifest.id);
  if (!id) {
    throw new Error("pet.json id must contain letters or numbers.");
  }
  return {
    ...manifest,
    id
  };
}

export function uploadManifestFile(manifest: UploadManifest) {
  return new File([JSON.stringify(manifest, null, 2) + "\n"], "pet.json", { type: "application/json" });
}
