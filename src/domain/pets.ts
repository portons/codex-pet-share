import { APP_HANDLE } from "../branding/brand";
import type { DownloadCommandMode } from "../downloads/DownloadCommandRow";
import { galleryRequestTags, isEditablePetKind } from "./config";
import { petAssetUrl } from "./http";
import type { CollectionSummary, GalleryUrlState, Pet } from "./types";

export function petImportCommand(pet: Pet, mode: DownloadCommandMode) {
  if (mode === "cli") {
    return `npx ${APP_HANDLE} add ${pet.id}`;
  }

  return [
    `curl -L "${pet.downloadUrl}" \\`,
    `  -o "/tmp/${pet.id}.codex-pet.zip" &&`,
    `mkdir -p "$HOME/.codex/pets/${pet.id}" &&`,
    `unzip -o "/tmp/${pet.id}.codex-pet.zip" \\`,
    `  -d "$HOME/.codex/pets/${pet.id}"`
  ].join("\n");
}

export function petCodexInstallUrl(pet: Pet) {
  const prompt = `Install this pet: ${petImportCommand(pet, "cli")}`;
  return `codex://new?prompt=${encodeURIComponent(prompt)}`;
}

type CollectionInstallTarget = Pick<CollectionSummary, "slug">;

export function collectionImportCommand(collection: CollectionInstallTarget) {
  return `npx ${APP_HANDLE} add-collection ${collection.slug}`;
}

export function collectionCodexInstallUrl(collection: CollectionInstallTarget) {
  const prompt = `Install this collection: ${collectionImportCommand(collection)}`;
  return `codex://new?prompt=${encodeURIComponent(prompt)}`;
}

export function normalizePet(pet: Pet): Pet {
  return {
    ...pet,
    tags: pet.tags || [],
    likeCount: pet.likeCount || 0,
    commentCount: pet.commentCount || 0,
    likedByMe: Boolean(pet.likedByMe),
    ownerShadowbanned: Boolean(pet.ownerShadowbanned),
    spritesheetUrl: petAssetUrl(pet.spritesheetUrl),
    posterUrl: petAssetUrl(pet.posterUrl),
    previewUrl: petAssetUrl(pet.previewUrl),
    shareImageUrl: petAssetUrl(pet.shareImageUrl),
    downloadUrl: petAssetUrl(pet.downloadUrl),
    kind: isEditablePetKind(pet.kind) ? pet.kind : "object"
  };
}

export function isNsfwPet(pet: Pet) {
  return pet.tags.includes("nsfw");
}

function petMatchesQuery(pet: Pet, query: string) {
  const needle = query.trim().toLowerCase().replace(/[%*(),]/g, "");
  if (!needle) {
    return true;
  }
  return [
    pet.id,
    pet.displayName,
    pet.description,
    pet.ownerName,
    pet.ownerHandle || "",
    pet.kind,
    ...pet.tags
  ].some((value) => value.toLowerCase().includes(needle));
}

function petMatchesTagFilter(pet: Pet, tags: Array<string>) {
  const requestTags = galleryRequestTags(tags);
  return !requestTags.length || requestTags.some((tag) => pet.tags.includes(tag));
}

export function petMatchesGalleryFilters(pet: Pet, state: GalleryUrlState) {
  return (
    petMatchesQuery(pet, state.query) &&
    petMatchesTagFilter(pet, state.tags) &&
    (state.kind === "all" || pet.kind === state.kind) &&
    (state.content === "all" || !isNsfwPet(pet))
  );
}

function compareNumber(left: number, right: number) {
  return left - right;
}

export function collectionTopPets(pets: Array<Pet>) {
  return [...pets]
    .sort((left, right) =>
      compareNumber(right.likeCount, left.likeCount)
      || compareNumber(right.viewCount, left.viewCount)
      || left.displayName.localeCompare(right.displayName)
    )
    .slice(0, 3);
}
