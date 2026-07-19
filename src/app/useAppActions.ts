import { useAdminActions } from "../admin/useAdminActions";
import { useCommentNotifications } from "../comments/useCommentNotifications";
import { usePetComments } from "../pets/usePetComments";
import { usePetEditors } from "../pets/usePetEditors";
import { usePetMutations } from "../pets/usePetMutations";
import { useUploadWorkflow } from "../uploads/useUploadWorkflow";
import type { useAuthForms } from "../auth/useAuthForms";
import type { useGalleryBrowser } from "../gallery/useGalleryBrowser";
import type { useAppEntityData } from "./useAppEntityData";
import type { AppDialogs } from "./useAppDialogs";
import type { useSessionApi } from "./useSessionApi";
import type { AuthSession, Route, User } from "../domain/types";

type GalleryBrowser = ReturnType<typeof useGalleryBrowser>;
type EntityData = ReturnType<typeof useAppEntityData>;
type SessionApi = ReturnType<typeof useSessionApi>;
type AuthForms = ReturnType<typeof useAuthForms>;

export type AppActions = ReturnType<typeof useAppActions>;

/**
 * Groups the pet/admin/upload action hooks that sit between the auth forms and
 * the user-collection actions in App's hook sequence. The hooks are called in
 * the exact order App originally called them, so React's hook order is
 * unchanged.
 */
export function useAppActions({
  user,
  route,
  session,
  apiFetch,
  gallery,
  entity,
  dialogs,
  auth,
  refresh
}: {
  user: User | null;
  route: Route;
  session: AuthSession | null;
  apiFetch: SessionApi["apiFetch"];
  gallery: GalleryBrowser;
  entity: EntityData;
  dialogs: AppDialogs;
  auth: AuthForms;
  refresh: (authSession?: AuthSession | null) => Promise<void>;
}) {
  const petMutations = usePetMutations({
    user,
    route,
    session,
    contentMode: gallery.contentMode,
    query: gallery.query,
    activeTags: gallery.activeTags,
    activeSort: gallery.activeSort,
    activeView: gallery.activeView,
    activeKind: gallery.activeKind,
    activeFormat: gallery.activeFormat,
    galleryMeta: gallery.galleryMeta,
    creatorMeta: entity.creatorMeta,
    setCreatorMeta: entity.setCreatorMeta,
    creatorPets: entity.creatorPets,
    collectionPets: entity.collectionPets,
    adminCollections: entity.adminCollections,
    apiFetch,
    setAuthStatus: auth.setAuthStatus,
    setPets: gallery.setPets,
    setMinePets: entity.setMinePets,
    setFavoritePets: entity.setFavoritePets,
    setCreatorPets: entity.setCreatorPets,
    setDetailPet: entity.setDetailPet,
    setMorePets: entity.setMorePets,
    setCollectionPets: entity.setCollectionPets,
    setSharingPet: dialogs.setSharingPet,
    setCreator: entity.setCreator,
    setCollections: entity.setCollections,
    setAdminCollections: entity.setAdminCollections,
    setCollectionDetail: entity.setCollectionDetail,
    loadCollections: entity.loadCollections,
    refreshRoutePetLists: entity.refreshRoutePetLists,
    loadCreator: entity.loadCreator,
    loadCreators: entity.loadCreators,
    removePetFromGallery: gallery.removePetFromGallery,
    openAuth: auth.openAuth
  });
  const petComments = usePetComments({
    apiFetch,
    session,
    user,
    setDetailPet: entity.setDetailPet,
    openAuth: auth.openAuth
  });
  const commentNotifications = useCommentNotifications({
    apiFetch,
    session,
    user
  });
  const admin = useAdminActions({
    user,
    session,
    route,
    contentMode: gallery.contentMode,
    apiFetch,
    setAuthStatus: auth.setAuthStatus,
    setPets: gallery.setPets,
    setMinePets: entity.setMinePets,
    setFavoritePets: entity.setFavoritePets,
    setCreatorPets: entity.setCreatorPets,
    setDetailPet: entity.setDetailPet,
    setSharingPet: dialogs.setSharingPet,
    setCreator: entity.setCreator,
    loadAdminCollections: entity.loadAdminCollections,
    loadCollections: entity.loadCollections,
    refreshPrimaryPetLists: entity.refreshPrimaryPetLists,
    refreshRoutePetLists: entity.refreshRoutePetLists,
    replacePet: petMutations.replacePet
  });
  const upload = useUploadWorkflow({ apiFetch, refresh });
  const petEditors = usePetEditors({
    user,
    adminCollections: entity.adminCollections,
    setAdminCollections: entity.setAdminCollections,
    apiFetch,
    reconcileTaggedPet: petMutations.reconcileTaggedPet,
    reconcilePetCollections: petMutations.reconcilePetCollections
  });

  return { petMutations, petComments, commentNotifications, admin, upload, petEditors };
}
