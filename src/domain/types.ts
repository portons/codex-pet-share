export type User = {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  isShadowbanned: boolean;
};

export type Pet = {
  id: string;
  displayName: string;
  description: string;
  spritesheetPath: string;
  kind: EditablePetKind;
  spritesheetUrl: string;
  previewUrl: string;
  shareImageUrl: string;
  downloadUrl: string;
  ownerId: string | null;
  ownerHandle: string | null;
  ownerName: string;
  uploadedAt: string;
  viewCount: number;
  downloadCount: number;
  likeCount: number;
  likedByMe: boolean;
  ownerShadowbanned: boolean;
  tags: string[];
  validationReport?: ValidationReport;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type Route =
  | { name: "gallery" }
  | { name: "mine" }
  | { name: "favorites" }
  | { name: "upload" }
  | { name: "creators" }
  | { name: "collections" }
  | { name: "collection"; slug: string }
  | { name: "admin" }
  | { name: "detail"; id: string }
  | { name: "user"; id: string }
  | { name: "room"; id: string }
  | { name: "collectionRoom"; slug: string };

export type GallerySort = "new" | "popular" | "views" | "random";
export type GalleryView = "standard" | "compact";
export type PetKind = "all" | "object" | "animal" | "person" | "creature";
export type EditablePetKind = Exclude<PetKind, "all">;
export type ContentMode = "safe" | "all";

export type UploadManifest = {
  id: string;
  displayName: string;
  description: string;
  spritesheetPath: string;
  kind?: EditablePetKind;
};

export type UploadState = {
  manifest: File | null;
  spritesheet: File | null;
  kind: EditablePetKind;
  tags: string[];
};

export type GalleryMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type GalleryResponse = GalleryMeta & {
  pets: Pet[];
};

export type CreatorStats = {
  petCount: number;
  viewCount: number;
  likeCount: number;
  downloadCount: number | null;
};

export type Creator = {
  id: string;
  handle: string;
  displayName: string;
  shadowbanned?: boolean;
};

export type CreatorPetsResponse = GalleryMeta & {
  user: Creator;
  pets: Pet[];
  stats: CreatorStats;
};

export type CreatorLeaderboardItem = {
  id: string;
  handle: string | null;
  displayName: string;
  petCount: number;
  viewCount: number;
  likeCount: number;
  topPets: Array<Pet>;
};

export type CreatorsLeaderboardResponse = {
  creators: Array<CreatorLeaderboardItem>;
  total: number;
};

export type CollectionSummary = {
  slug: string;
  displayName: string;
  ownerId: string | null;
  editable?: boolean;
  petCount: number;
  topPets: Array<Pet>;
  petIds?: Array<string>;
};

export type CollectionDetailResponse = {
  collection: Omit<CollectionSummary, "topPets">;
  pets: Array<Pet>;
};

export type CollectionsResponse = {
  collections: Array<CollectionSummary>;
};

export type GalleryUrlState = {
  query: string;
  tags: string[];
  sort: GallerySort;
  page: number;
  view: GalleryView;
  kind: PetKind;
  content: ContentMode;
};

export type ValidationReport = {
  manifestId: string;
  atlasSize: string;
  cellSize: string;
  statesDetected: number;
  manifestBytes: number;
  spritesheetBytes: number;
};

export type EntityShareTarget = {
  kind: "creator" | "collection";
  title: string;
  subtitle: string;
  shareUrl: string;
  imageUrl: string;
  shareText: string;
  ariaLabel: string;
};
