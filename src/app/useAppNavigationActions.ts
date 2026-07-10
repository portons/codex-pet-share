import type { Dispatch, SetStateAction } from "react";
import { saveContentModePreference } from "../domain/config";
import { collectionHash, creatorHash, creatorsHash, navigate, pushHash } from "../domain/routing";
import type {
  AuthSession,
  ContentMode,
  GalleryFormat,
  CreatorLeaderboardSort,
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
  activeFormat,
  galleryMeta,
  creatorMeta,
  creatorsMeta,
  creatorsSort,
  creatorsQuery,
  collectionMeta,
  apiFetch,
  applySession,
  setUser,
  setMinePets,
  setFavoritePets,
  setCreatorMeta,
  setCreatorsMeta,
  setCreatorsSort,
  setCreatorsQuery,
  setCollectionMeta,
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
  activeFormat: GalleryFormat;
  galleryMeta: GalleryMeta;
  creatorMeta: GalleryMeta;
  creatorsMeta: GalleryMeta;
  creatorsSort: CreatorLeaderboardSort;
  creatorsQuery: string;
  collectionMeta: GalleryMeta;
  apiFetch: ApiFetch;
  applySession: (next: AuthSession | null) => void;
  setUser: Dispatch<SetStateAction<User | null>>;
  setMinePets: Dispatch<SetStateAction<Pet[]>>;
  setFavoritePets: Dispatch<SetStateAction<Pet[]>>;
  setCreatorMeta: Dispatch<SetStateAction<GalleryMeta>>;
  setCreatorsMeta: Dispatch<SetStateAction<GalleryMeta>>;
  setCreatorsSort: Dispatch<SetStateAction<CreatorLeaderboardSort>>;
  setCreatorsQuery: Dispatch<SetStateAction<string>>;
  setCollectionMeta: Dispatch<SetStateAction<GalleryMeta>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  pushGalleryState: (state: {
    query: string;
    tags: string[];
    sort: GallerySort;
    page: number;
    view: GalleryView;
    kind: PetKind;
    format: GalleryFormat;
    content: ContentMode;
  }) => void;
  scrollPageTop: () => void;
  loadGallery: LoadGallery;
  loadCreator: (id: string, page?: number, authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadCreators: (authSession?: AuthSession | null, content?: ContentMode, page?: number, sort?: CreatorLeaderboardSort, query?: string) => Promise<void>;
  loadCollections: (authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadUserCollections: (currentUser?: User | null, authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadCollectionDetail: (slug: string, authSession?: AuthSession | null, content?: ContentMode, page?: number) => Promise<void>;
}) {
  async function selectContentMode(mode: ContentMode) {
    if (mode === contentMode) return;
    saveContentModePreference(mode);
    setContentMode(mode);
    const nextTags = mode === "safe" ? activeTags.filter((tag) => tag !== "nsfw") : activeTags;
    if (route.name === "gallery") {
      const nextState = { query, tags: nextTags, sort: activeSort, page: 1, view: activeView, kind: activeKind, format: activeFormat, content: mode };
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
      pushHash(creatorsHash(creatorsSort, 1, creatorsQuery));
      setCreatorsMeta((current) => ({ ...current, page: 1 }));
      await loadCreators(session, mode, 1, creatorsSort, creatorsQuery);
    }
    if (route.name === "collections") {
      await Promise.all([
        loadCollections(session, mode),
        loadUserCollections(user, session, mode)
      ]);
    }
    if (route.name === "collection") {
      pushHash(collectionHash(route.slug, 1));
      setCollectionMeta((current) => ({ ...current, page: 1 }));
      await loadCollectionDetail(route.slug, session, mode, 1);
    }
  }

  async function selectCreatorPage(page: number) {
    if (route.name !== "user" || page === creatorMeta.page) return;
    pushHash(creatorHash(route.id, page));
    setCreatorMeta((current) => ({ ...current, page }));
    await loadCreator(route.id, page, session, contentMode);
    scrollPageTop();
  }

  async function selectCreatorsPage(page: number) {
    if (route.name !== "creators" || page === creatorsMeta.page) return;
    pushHash(creatorsHash(creatorsSort, page, creatorsQuery));
    setCreatorsMeta((current) => ({ ...current, page }));
    await loadCreators(session, contentMode, page, creatorsSort, creatorsQuery);
    scrollPageTop();
  }

  async function selectCreatorsSort(sort: CreatorLeaderboardSort) {
    if (route.name !== "creators" || sort === creatorsSort) return;
    pushHash(creatorsHash(sort, 1, creatorsQuery));
    setCreatorsSort(sort);
    setCreatorsMeta((current) => ({ ...current, page: 1 }));
    await loadCreators(session, contentMode, 1, sort, creatorsQuery);
    scrollPageTop();
  }

  async function selectCreatorsQuery(nextQuery: string) {
    if (route.name !== "creators") return;
    const cleanQuery = nextQuery.trim();
    pushHash(creatorsHash(creatorsSort, 1, cleanQuery));
    setCreatorsQuery(cleanQuery);
    setCreatorsMeta((current) => ({ ...current, page: 1 }));
    await loadCreators(session, contentMode, 1, creatorsSort, cleanQuery);
    scrollPageTop();
  }

  async function selectCollectionPage(page: number) {
    if (route.name !== "collection" || page === collectionMeta.page) return;
    pushHash(collectionHash(route.slug, page));
    setCollectionMeta((current) => ({ ...current, page }));
    await loadCollectionDetail(route.slug, session, contentMode, page);
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
    selectCreatorsPage,
    selectCreatorsSort,
    selectCreatorsQuery,
    selectCollectionPage,
    logout
  };
}
