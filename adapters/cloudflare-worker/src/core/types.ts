export type Env = {
  DB: D1Database;
  PET_ASSETS: R2Bucket;
  ROOMS: DurableObjectNamespace;
  ASSETS: Fetcher;
  APP_NAME: string;
  APP_HANDLE: string;
  APP_TAGLINE: string;
  APP_REPO_URL?: string;
  PUBLIC_APP_ORIGIN: string;
  CORS_ALLOWED_ORIGINS: string;
  ASSET_PUBLIC_BASE_URL: string;
  PET_BUCKET_PREFIX?: string;
  AUTH_SECRET: string;
  AUTH_EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  AUTH_GOOGLE_CLIENT_ID?: string;
  AUTH_GOOGLE_CLIENT_SECRET?: string;
  AUTH_X_CLIENT_ID?: string;
  AUTH_X_CLIENT_SECRET?: string;
  PET_STATS_SALT: string;
  PETSHARE_MAINTENANCE?: string;
};

export type AppContext = {
  env: Env;
  request: Request;
  url: URL;
  executionCtx?: ExecutionContext;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isShadowbanned: boolean;
  emailVerified: boolean;
};

export type PublicUser = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  shadowbanned?: boolean;
};

export type PetKind = "object" | "animal" | "person" | "creature";
export type PetSort = "new" | "popular" | "views" | "discussed" | "random";
export type ContentMode = "safe" | "all";

export type ValidationReport = {
  manifestId: string;
  atlasSize: string;
  cellSize: string;
  statesDetected: number;
  manifestBytes: number;
  spritesheetBytes: number;
};

export type PetRow = {
  id: string;
  display_name: string;
  description: string;
  spritesheet_path: string;
  kind: PetKind;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  source: "upload" | "seed";
  view_count: number;
  download_count: number;
  like_count: number;
  comment_count?: number;
  latest_comment_at?: string | null;
  tags_json: string;
  validation_report_json: string | null;
  owner_handle?: string | null;
  owner_display_name?: string | null;
  owner_shadowbanned_at?: string | null;
  owner_avatar_path?: string | null;
  owner_avatar_updated_at?: string | null;
};

export type CollectionRow = {
  slug: string;
  display_name: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Pagination = {
  page: number;
  pageSize: number;
};

export type Viewer = Pick<AuthUser, "id" | "isAdmin" | "isShadowbanned"> | null | undefined;

export type UploadFile = {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};
