import { navigate, routeFromHash } from "../domain/routing";
import { refreshAfterAuthRoute } from "./appRefreshActions";
import type { Dispatch, SetStateAction } from "react";
import type { useGalleryBrowser } from "../gallery/useGalleryBrowser";
import type { useAppEntityData } from "./useAppEntityData";
import type { AuthSession, Route, User } from "../domain/types";

type GalleryBrowser = ReturnType<typeof useGalleryBrowser>;
type EntityData = ReturnType<typeof useAppEntityData>;

export function createAppSessionHandlers({
  route,
  setRoute,
  session,
  gallery,
  entity,
  refresh
}: {
  route: Route;
  setRoute: Dispatch<SetStateAction<Route>>;
  session: AuthSession | null;
  gallery: GalleryBrowser;
  entity: EntityData;
  refresh: (authSession?: AuthSession | null) => Promise<void>;
}) {
  async function handleAccountDeleted() {
    entity.setMinePets([]);
    entity.setFavoritePets([]);
    entity.setUserCollections([]);
    entity.setAdminCollections([]);
    entity.setDetailPet(null);
    entity.setCreator(null);
    entity.setCreatorPets([]);
    navigate("/");
    setRoute(routeFromHash());
  }

  async function refreshAfterAuth(nextUser: User, nextSession: AuthSession) {
    await refreshAfterAuthRoute({
      nextUser,
      nextSession,
      route,
      query: gallery.query,
      activeTags: gallery.activeTags,
      activeSort: gallery.activeSort,
      activeView: gallery.activeView,
      activeKind: gallery.activeKind,
      contentMode: gallery.contentMode,
      galleryMeta: gallery.galleryMeta,
      creatorMeta: entity.creatorMeta,
      refresh,
      loadGallery: gallery.loadGallery,
      loadMine: entity.loadMine,
      loadFavorites: entity.loadFavorites,
      loadCreator: entity.loadCreator,
      loadCreators: entity.loadCreators,
      loadCollections: entity.loadCollections,
      loadUserCollections: entity.loadUserCollections,
      loadCollectionDetail: entity.loadCollectionDetail,
      loadAdminCollections: entity.loadAdminCollections
    });
  }

  async function refreshAfterSettings(nextUser: User) {
    await entity.refreshPrimaryPetLists(session, nextUser);
    entity.setDetailPet((current) =>
      current?.ownerId === nextUser.id ? { ...current, ownerName: nextUser.displayName, ownerAvatarUrl: nextUser.avatarUrl } : current
    );
  }

  return { handleAccountDeleted, refreshAfterAuth, refreshAfterSettings };
}
