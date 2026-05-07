import { sessionNeedsRefresh } from "../domain/session";
import type { AuthSession, ContentMode, GalleryMeta, GallerySort, GalleryView, PetKind, Route, User } from "../domain/types";

type LoadGallery = (
  query: string,
  tags: string[],
  sort: GallerySort,
  page: number,
  authSession: AuthSession | null,
  content: ContentMode,
  view: GalleryView,
  kind: PetKind
) => Promise<void>;

export async function refreshAfterAuthRoute({
  nextUser,
  nextSession,
  route,
  query,
  activeTags,
  activeSort,
  activeView,
  activeKind,
  contentMode,
  galleryMeta,
  creatorMeta,
  refresh,
  loadGallery,
  loadMine,
  loadFavorites,
  loadCreator,
  loadCreators,
  loadCollections,
  loadCollectionDetail,
  loadAdminCollections
}: {
  nextUser: User;
  nextSession: AuthSession;
  route: Route;
  query: string;
  activeTags: string[];
  activeSort: GallerySort;
  activeView: GalleryView;
  activeKind: PetKind;
  contentMode: ContentMode;
  galleryMeta: GalleryMeta;
  creatorMeta: GalleryMeta;
  refresh: (authSession?: AuthSession | null) => Promise<void>;
  loadGallery: LoadGallery;
  loadMine: (currentUser?: User | null, authSession?: AuthSession | null) => Promise<void>;
  loadFavorites: (currentUser?: User | null, authSession?: AuthSession | null) => Promise<void>;
  loadCreator: (id: string, page?: number, authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadCreators: (authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadCollections: (authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadCollectionDetail: (slug: string, authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadAdminCollections: (authSession?: AuthSession | null, currentUser?: User | null) => Promise<void>;
}) {
  await refresh(nextSession);
  if (route.name === "gallery") {
    await loadGallery(query, activeTags, activeSort, galleryMeta.page, nextSession, contentMode, activeView, activeKind);
  }
  if (route.name === "mine") await loadMine(nextUser, nextSession);
  if (route.name === "favorites") await loadFavorites(nextUser, nextSession);
  if (route.name === "user") await loadCreator(route.id, creatorMeta.page, nextSession, contentMode);
  if (route.name === "creators") await loadCreators(nextSession, contentMode);
  if (route.name === "collections") await loadCollections(nextSession, contentMode);
  if (route.name === "collection") await loadCollectionDetail(route.slug, nextSession, contentMode);
  if (nextUser.isAdmin && route.name === "admin") await loadAdminCollections(nextSession);
}

export async function refreshAppSession({
  authSession,
  route,
  refreshSession,
  loadMe,
  loadAdminCollections,
  setAuthStatus
}: {
  authSession: AuthSession | null;
  route: Route;
  refreshSession: (authSession: AuthSession | null) => Promise<AuthSession | null>;
  loadMe: (authSession: AuthSession | null) => Promise<User | null>;
  loadAdminCollections: (authSession?: AuthSession | null, currentUser?: User | null) => Promise<void>;
  setAuthStatus: (next: string) => void;
}) {
  try {
    const nextSession = sessionNeedsRefresh(authSession) ? await refreshSession(authSession) : authSession;
    const currentUser = await loadMe(nextSession);
    if (route.name === "admin") {
      await loadAdminCollections(nextSession, currentUser);
    }
  } catch (error) {
    setAuthStatus(error instanceof Error ? error.message : "failed to load app");
  }
}
