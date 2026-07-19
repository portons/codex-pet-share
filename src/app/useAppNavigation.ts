import { useAppNavigationActions } from "./useAppNavigationActions";
import type { useGalleryBrowser } from "../gallery/useGalleryBrowser";
import type { useAppEntityData } from "./useAppEntityData";
import type { useSessionApi } from "./useSessionApi";
import type { AuthSession, Route, User } from "../domain/types";

type GalleryBrowser = ReturnType<typeof useGalleryBrowser>;
type EntityData = ReturnType<typeof useAppEntityData>;
type SessionApi = ReturnType<typeof useSessionApi>;

export type AppNavigation = ReturnType<typeof useAppNavigation>;

/** Adapts the grouped gallery/entity hook results to useAppNavigationActions. */
export function useAppNavigation({
  route,
  user,
  session,
  apiFetch,
  applySession,
  setUser,
  gallery,
  entity
}: {
  route: Route;
  user: User | null;
  session: AuthSession | null;
  apiFetch: SessionApi["apiFetch"];
  applySession: SessionApi["applySession"];
  setUser: SessionApi["setUser"];
  gallery: GalleryBrowser;
  entity: EntityData;
}) {
  return useAppNavigationActions({
    route,
    user,
    session,
    contentMode: gallery.contentMode,
    setContentMode: gallery.setContentMode,
    query: gallery.query,
    activeTags: gallery.activeTags,
    activeSort: gallery.activeSort,
    activeView: gallery.activeView,
    activeKind: gallery.activeKind,
    activeFormat: gallery.activeFormat,
    galleryMeta: gallery.galleryMeta,
    creatorMeta: entity.creatorMeta,
    creatorsMeta: entity.creatorsMeta,
    creatorsSort: entity.creatorsSort,
    creatorsQuery: entity.creatorsQuery,
    collectionMeta: entity.collectionMeta,
    apiFetch,
    applySession,
    setUser,
    setMinePets: entity.setMinePets,
    setFavoritePets: entity.setFavoritePets,
    setCreatorMeta: entity.setCreatorMeta,
    setCreatorsMeta: entity.setCreatorsMeta,
    setCreatorsSort: entity.setCreatorsSort,
    setCreatorsQuery: entity.setCreatorsQuery,
    setCollectionMeta: entity.setCollectionMeta,
    setLoading: gallery.setLoading,
    pushGalleryState: gallery.pushGalleryState,
    scrollPageTop: gallery.scrollPageTop,
    loadGallery: gallery.loadGallery,
    loadCreator: entity.loadCreator,
    loadCreators: entity.loadCreators,
    loadCollections: entity.loadCollections,
    loadUserCollections: entity.loadUserCollections,
    loadCollectionDetail: entity.loadCollectionDetail
  });
}
