import { useEffect, type Dispatch, type SetStateAction } from "react";
import { trackRouteView } from "../domain/analytics";
import {
  collectionPageFromHash,
  creatorPageFromHash,
  creatorsPageFromHash,
  creatorsQueryFromHash,
  creatorsSortFromHash,
  galleryUrlStateFromHash,
  routeFromHash
} from "../domain/routing";
import type {
  AuthSession,
  Creator,
  CreatorLeaderboardSort,
  GalleryMeta,
  GallerySort,
  GalleryView,
  Pet,
  PetKind,
  Route,
  User
} from "../domain/types";

type LoadGallery = (
  query: string,
  tags: string[],
  sort: GallerySort,
  page: number,
  authSession: AuthSession | null,
  content: "safe" | "all",
  view: GalleryView,
  kind: PetKind
) => Promise<void>;

export function useAppRouteEffects({
  route,
  setRoute,
  session,
  user,
  playgroundPet,
  refresh,
  loadCollections,
  loadUserCollections,
  setAuthStatus,
  applyGalleryState,
  setLoading,
  loadGallery,
  setUploadStatus,
  loadDetail,
  loadMine,
  loadFavorites,
  setCreator,
  setCreatorPets,
  setCreatorMeta,
  loadCreator,
  setCreatorsMeta,
  setCreatorsSort,
  setCreatorsQuery,
  loadCreators,
  setCollectionDetail,
  setCollectionPets,
  setCollectionMeta,
  loadCollectionDetail,
  loadAdminCollections,
  setAdminStatus
}: {
  route: Route;
  setRoute: Dispatch<SetStateAction<Route>>;
  session: AuthSession | null;
  user: User | null;
  playgroundPet: Pet | null;
  refresh: (authSession?: AuthSession | null) => Promise<void>;
  loadCollections: (authSession?: AuthSession | null, content?: "safe" | "all") => Promise<void>;
  loadUserCollections: (currentUser?: User | null, authSession?: AuthSession | null, content?: "safe" | "all") => Promise<void>;
  setAuthStatus: Dispatch<SetStateAction<string>>;
  applyGalleryState: (nextState: ReturnType<typeof galleryUrlStateFromHash>) => void;
  setLoading: Dispatch<SetStateAction<boolean>>;
  loadGallery: LoadGallery;
  setUploadStatus: Dispatch<SetStateAction<string>>;
  loadDetail: (id: string) => Promise<void>;
  loadMine: (currentUser?: User | null, authSession?: AuthSession | null) => Promise<void>;
  loadFavorites: (currentUser?: User | null, authSession?: AuthSession | null) => Promise<void>;
  setCreator: Dispatch<SetStateAction<Creator | null>>;
  setCreatorPets: Dispatch<SetStateAction<Pet[]>>;
  setCreatorMeta: Dispatch<SetStateAction<GalleryMeta>>;
  loadCreator: (id: string, page?: number, authSession?: AuthSession | null, content?: "safe" | "all") => Promise<void>;
  setCreatorsMeta: Dispatch<SetStateAction<GalleryMeta>>;
  setCreatorsSort: Dispatch<SetStateAction<CreatorLeaderboardSort>>;
  setCreatorsQuery: Dispatch<SetStateAction<string>>;
  loadCreators: (authSession?: AuthSession | null, content?: "safe" | "all", page?: number, sort?: CreatorLeaderboardSort, query?: string) => Promise<void>;
  setCollectionDetail: Dispatch<SetStateAction<Omit<import("../domain/types").CollectionSummary, "topPets"> | null>>;
  setCollectionPets: Dispatch<SetStateAction<Pet[]>>;
  setCollectionMeta: Dispatch<SetStateAction<GalleryMeta>>;
  loadCollectionDetail: (slug: string, authSession?: AuthSession | null, content?: "safe" | "all", page?: number) => Promise<void>;
  loadAdminCollections: (authSession?: AuthSession | null, currentUser?: User | null) => Promise<void>;
  setAdminStatus: Dispatch<SetStateAction<string>>;
}) {
  useEffect(() => {
    trackRouteView(route.name, user);
  }, [route, user?.id]);

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    refresh();
    if (route.name !== "collections") {
      loadCollections().catch((error) =>
        setAuthStatus(error instanceof Error ? error.message : "failed to load collections")
      );
    }
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, []);

  useEffect(() => {
    if (route.name === "gallery") {
      const nextState = galleryUrlStateFromHash();
      applyGalleryState(nextState);
      setLoading(true);
      loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, nextState.view, nextState.kind)
        .catch((error) => setAuthStatus(error instanceof Error ? error.message : "failed to load gallery"))
        .finally(() => setLoading(false));
    }
    if (route.name === "detail") {
      loadDetail(route.id).catch((error) =>
        setUploadStatus(error instanceof Error ? error.message : "failed to load pet")
      );
    }
    if (route.name === "user") {
      setCreator(null);
      setCreatorPets([]);
      const page = creatorPageFromHash();
      setCreatorMeta((current) => ({ ...current, page }));
      loadCreator(route.id, page).catch((error) =>
        setAuthStatus(error instanceof Error ? error.message : "failed to load creator")
      );
    }
    if (route.name === "creators") {
      const page = creatorsPageFromHash();
      const sort = creatorsSortFromHash();
      const query = creatorsQueryFromHash();
      setCreatorsMeta((current) => ({ ...current, page }));
      setCreatorsSort(sort);
      setCreatorsQuery(query);
      loadCreators(session, undefined, page, sort, query).catch((error) =>
        setAuthStatus(error instanceof Error ? error.message : "failed to load creators")
      );
    }
    if (route.name === "collections") {
      loadCollections().catch((error) =>
        setAuthStatus(error instanceof Error ? error.message : "failed to load collections")
      );
      loadUserCollections(user, session).catch((error) =>
        setAuthStatus(error instanceof Error ? error.message : "failed to load your collections")
      );
    }
    if (route.name === "collection") {
      setCollectionDetail(null);
      setCollectionPets([]);
      const page = collectionPageFromHash();
      setCollectionMeta((current) => ({ ...current, page }));
      loadCollectionDetail(route.slug, session, undefined, page).catch((error) =>
        setAuthStatus(error instanceof Error ? error.message : "failed to load collection")
      );
    }
  }, [route]);

  useEffect(() => {
    if (route.name === "mine") {
      loadMine(user, session).catch((error) =>
        setAuthStatus(error instanceof Error ? error.message : "failed to load uploads")
      );
    }
    if (route.name === "favorites") {
      loadFavorites(user, session).catch((error) =>
        setAuthStatus(error instanceof Error ? error.message : "failed to load favorites")
      );
    }
    if (route.name === "admin") {
      loadAdminCollections(session, user).catch((error) =>
        setAdminStatus(error instanceof Error ? error.message : "failed to load admin collections")
      );
    }
    if (user) {
      loadUserCollections(user, session).catch((error) =>
        setAuthStatus(error instanceof Error ? error.message : "failed to load your collections")
      );
    }
  }, [route, user, session]);

  useEffect(() => {
    if (!playgroundPet || !user) return;
    loadFavorites(user, session).catch(() => {});
  }, [playgroundPet, user, session]);
}
