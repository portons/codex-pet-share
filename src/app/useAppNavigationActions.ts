import type { Dispatch, SetStateAction } from "react";
import { creatorHash, navigate, pushHash } from "../domain/routing";
import type {
  AuthSession,
  ContentMode,
  GalleryMeta,
  GallerySort,
  GalleryView,
  Pet,
  PetKind,
  Route,
  User
} from "../domain/types";

type ApiFetch = (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;
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

export function useAppNavigationActions({
  route,
  user,
  session,
  contentMode,
  setContentMode,
  query,
  activeTags,
  activeSort,
  activeView,
  activeKind,
  galleryMeta,
  creatorMeta,
  apiFetch,
  applySession,
  setUser,
  setMinePets,
  setFavoritePets,
  setCreatorMeta,
  setLoading,
  pushGalleryState,
  scrollPageTop,
  loadGallery,
  loadCreator,
  loadCreators,
  loadCollections,
  loadUserCollections,
  loadCollectionDetail
}: {
  route: Route;
  user: User | null;
  session: AuthSession | null;
  contentMode: ContentMode;
  setContentMode: Dispatch<SetStateAction<ContentMode>>;
  query: string;
  activeTags: string[];
  activeSort: GallerySort;
  activeView: GalleryView;
  activeKind: PetKind;
  galleryMeta: GalleryMeta;
  creatorMeta: GalleryMeta;
  apiFetch: ApiFetch;
  applySession: (next: AuthSession | null) => void;
  setUser: Dispatch<SetStateAction<User | null>>;
  setMinePets: Dispatch<SetStateAction<Pet[]>>;
  setFavoritePets: Dispatch<SetStateAction<Pet[]>>;
  setCreatorMeta: Dispatch<SetStateAction<GalleryMeta>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  pushGalleryState: (state: {
    query: string;
    tags: string[];
    sort: GallerySort;
    page: number;
    view: GalleryView;
    kind: PetKind;
    content: ContentMode;
  }) => void;
  scrollPageTop: () => void;
  loadGallery: LoadGallery;
  loadCreator: (id: string, page?: number, authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadCreators: (authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadCollections: (authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadUserCollections: (currentUser?: User | null, authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadCollectionDetail: (slug: string, authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
}) {
  async function selectContentMode(mode: ContentMode) {
    if (mode === contentMode) return;
    setContentMode(mode);
    if (route.name === "gallery") {
      const nextState = { query, tags: activeTags, sort: activeSort, page: 1, view: activeView, kind: activeKind, content: mode };
      pushGalleryState(nextState);
      setLoading(true);
      try {
        await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, activeView, nextState.kind);
      } finally {
        setLoading(false);
      }
    }
    if (route.name === "user") {
      pushHash(creatorHash(route.id, 1));
      setCreatorMeta((current) => ({ ...current, page: 1 }));
      await loadCreator(route.id, 1, session, mode);
      scrollPageTop();
    }
    if (route.name === "creators") {
      await loadCreators(session, mode);
    }
    if (route.name === "collections") {
      await Promise.all([
        loadCollections(session, mode),
        loadUserCollections(user, session, mode)
      ]);
    }
    if (route.name === "collection") {
      await loadCollectionDetail(route.slug, session, mode);
    }
  }

  async function selectCreatorPage(page: number) {
    if (route.name !== "user" || page === creatorMeta.page) return;
    pushHash(creatorHash(route.id, page));
    setCreatorMeta((current) => ({ ...current, page }));
    await loadCreator(route.id, page, session, contentMode);
    scrollPageTop();
  }

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      applySession(null);
      setUser(null);
      setMinePets([]);
      setFavoritePets([]);
      if (route.name === "mine" || route.name === "favorites") {
        navigate("/");
      }
    }
  }

  return {
    selectContentMode,
    selectCreatorPage,
    logout
  };
}
