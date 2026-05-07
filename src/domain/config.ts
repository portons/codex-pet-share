import type {
  EditablePetKind,
  GallerySort,
  GalleryUrlState,
  GalleryView,
  PetKind,
  UploadState
} from "./types";

export const apiBaseUrl = String(import.meta.env.VITE_APP_API_BASE_URL || "").replace(/\/$/, "");
export const publicAppOrigin = String(import.meta.env.VITE_PUBLIC_APP_ORIGIN || "").replace(/\/$/, "");
export const authStorageKey = "codex-pet-share.session";
export const sessionRefreshWindowSeconds = 120;

export const emptyUpload: UploadState = {
  manifest: null,
  spritesheet: null,
  kind: "object",
  tags: []
};

export const petStates = [
  { id: "idle", label: "Idle", row: 0, frames: 6 },
  { id: "running-right", label: "Run right", row: 1, frames: 8 },
  { id: "running-left", label: "Run left", row: 2, frames: 8 },
  { id: "waving", label: "Waving", row: 3, frames: 4 },
  { id: "jumping", label: "Jumping", row: 4, frames: 5 },
  { id: "failed", label: "Failed", row: 5, frames: 8 },
  { id: "waiting", label: "Waiting", row: 6, frames: 6 },
  { id: "running", label: "Running", row: 7, frames: 6 },
  { id: "review", label: "Review", row: 8, frames: 6 }
] as const;

export type PetState = (typeof petStates)[number];
export type CursorPreviewStateId = "idle" | "waiting" | "running-left" | "running-right";

export const previewFrameCount = petStates.reduce((total, state) => total + state.frames, 0);
export const previewSpriteFrames = petStates.flatMap((state) =>
  Array.from({ length: state.frames }, (_, frame) => ({ row: state.row, frame }))
);
export const spriteCellWidth = 192;
export const spriteCellHeight = 208;
export const gifAlphaThreshold = 200;
export const cursorPreviewWidth = 96;
export const cursorPreviewHeight = 104;
export const cursorPreviewOffset = 18;
export const cursorIdleDelayMs = 360;
export const cursorWaitingDelayMs = 1800;
export const cursorPreviewMinTiltDeg = 3;
export const cursorPreviewMaxTiltDeg = 12;
export const cursorPreviewTiltSpeedFactor = 16;

export const allowedTags = [
  "cute",
  "weird",
  "minimal",
  "animated",
  "pixel",
  "hand-drawn",
  "retro",
  "game",
  "object",
  "animal",
  "person",
  "creature",
  "clippy",
  "robot",
  "anime",
  "spooky",
  "soft",
  "chaotic",
  "utility",
  "mascot",
  "celeb",
  "nsfw"
] as const;

export type TagName = (typeof allowedTags)[number];

export const petKindTags = ["object", "animal", "person", "creature"] as const;
export const petKindOptions: Array<{ id: PetKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "object", label: "Object" },
  { id: "animal", label: "Animal" },
  { id: "person", label: "Person" },
  { id: "creature", label: "Creature" }
];
export const editablePetKindOptions = petKindOptions.filter(
  (kind): kind is { id: EditablePetKind; label: string } => kind.id !== "all"
);
export const galleryFilterTags = allowedTags
  .filter((tag) => !(petKindTags as readonly string[]).includes(tag))
  .sort((a, b) => a.localeCompare(b)) as Array<TagName>;
export const gallerySorts: { id: GallerySort; label: string }[] = [
  { id: "new", label: "Newest" },
  { id: "popular", label: "Most Liked" },
  { id: "views", label: "Most Viewed" },
  { id: "random", label: "Random" }
];

export const defaultGalleryUrlState: GalleryUrlState = {
  query: "",
  tags: [],
  sort: "new",
  page: 1,
  view: "standard",
  kind: "all",
  content: "safe"
};

export const defaultPageSize = 30;
export const compactPageSize = 60;
export const randomPageSize = 3;
export const compactRandomPageSize = 6;

export function galleryPageSize(view: GalleryView, sort: GallerySort = "new") {
  if (sort === "random") {
    return view === "compact" ? compactRandomPageSize : randomPageSize;
  }

  return view === "compact" ? compactPageSize : defaultPageSize;
}

export function randomRequestToken() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function galleryRequestTags(tags: Array<string>) {
  return Array.from(new Set(tags));
}

export function isTagName(value: string): value is TagName {
  return (allowedTags as readonly string[]).includes(value);
}

export function isGallerySort(value: string | null): value is GallerySort {
  return value === "new" || value === "popular" || value === "views" || value === "random";
}

export function isGalleryView(value: string | null): value is GalleryView {
  return value === "standard" || value === "compact";
}

export function isPetKind(value: string | null): value is PetKind {
  return Boolean(value && petKindOptions.some((kind) => kind.id === value));
}

export function isEditablePetKind(value: string | null | undefined): value is EditablePetKind {
  return Boolean(value && editablePetKindOptions.some((kind) => kind.id === value));
}

export function isContentMode(value: string | null): value is GalleryUrlState["content"] {
  return value === "safe" || value === "all";
}
