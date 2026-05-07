import { useState } from "react";
import { useAdminActions } from "../admin/useAdminActions";
import { useAppEntityData } from "./useAppEntityData";
import { useAppNavigationActions } from "./useAppNavigationActions";
import { useAppRouteEffects } from "./useAppRouteEffects";
import { AppView, type AppViewProps } from "./AppView";
import { useSessionApi } from "./useSessionApi";
import { useAuthForms } from "../auth/useAuthForms";
import { routeFromHash } from "../domain/routing";
import { useUploadWorkflow } from "../uploads/useUploadWorkflow";
import { usePetEditors } from "../pets/usePetEditors";
import { usePetMutations } from "../pets/usePetMutations";
import { useGalleryBrowser } from "../gallery/useGalleryBrowser";
import { refreshAfterAuthRoute, refreshAppSession } from "./appRefreshActions";
import type {
  AuthSession,
  CollectionSummary,
  EntityShareTarget,
  Pet,
  Route,
  User
} from "../domain/types";

export type { CollectionSummary, Pet, User } from "../domain/types";

function App() {
  const [route, setRoute] = useState<Route>(() => routeFromHash());
  const { session, user, setUser, apiFetch, applySession, loadMe, refreshSession } = useSessionApi();
  const {
    pets,
    setPets,
    galleryMeta,
    loading,
    setLoading,
    query,
    setQuery,
    activeTags,
    activeSort,
    activeView,
    activeKind,
    contentMode,
    setContentMode,
    applyGalleryState,
    pushGalleryState,
    scrollPageTop,
    loadGallery,
    submitSearch,
    selectTag,
    clearTags,
    selectSort,
    selectView,
    selectKind,
    selectPage,
    randomizeGallery,
    selectVisibleTag,
    removePetFromGallery
  } = useGalleryBrowser({ apiFetch, session, route, setRoute });
  const {
    minePets,
    setMinePets,
    favoritePets,
    setFavoritePets,
    detailPet,
    setDetailPet,
    morePets,
    creator,
    setCreator,
    creatorPets,
    setCreatorPets,
    creatorMeta,
    setCreatorMeta,
    creators,
    creatorsTotal,
    collections,
    setCollections,
    adminCollections,
    setAdminCollections,
    collectionDetail,
    setCollectionDetail,
    collectionPets,
    setCollectionPets,
    detailLoading,
    mineLoading,
    favoritesLoading,
    creatorLoading,
    creatorsLoading,
    collectionsLoading,
    adminCollectionsLoading,
    collectionDetailLoading,
    loadMine,
    loadFavorites,
    loadDetail,
    loadCreator,
    loadCreators,
    loadCollections,
    loadCollectionDetail,
    loadAdminCollections,
    refreshPrimaryPetLists,
    refreshRoutePetLists
  } = useAppEntityData({
    apiFetch,
    session,
    user,
    route,
    query,
    activeTags,
    activeSort,
    activeView,
    activeKind,
    contentMode,
    galleryMeta,
    loadGallery
  });
  const [sharingPet, setSharingPet] = useState<Pet | null>(null);
  const [sharingEntity, setSharingEntity] = useState<EntityShareTarget | null>(null);
  const [downloadPet, setDownloadPet] = useState<Pet | null>(null);
  const [playgroundPet, setPlaygroundPet] = useState<Pet | null>(null);
  const {
    authOpen,
    authMode,
    selectAuthMode,
    displayName,
    setDisplayName,
    email,
    setEmail,
    password,
    setPassword,
    authStatus,
    setAuthStatus,
    authBusy,
    submitAuth,
    openAuth,
    closeAuth,
    settingsOpen,
    settingsDisplayName,
    setSettingsDisplayName,
    settingsStatus,
    settingsBusy,
    submitSettings,
    openSettings,
    closeSettings,
    setAuthMode
  } = useAuthForms({
    user,
    apiFetch,
    applySession,
    setUser,
    onAuthenticated: refreshAfterAuth,
    onSettingsSaved: refreshAfterSettings
  });
  const {
    deleteStatus,
    deletingPetId,
    likeBusyId,
    deleteUpload,
    replacePet,
    reconcilePetCollections,
    reconcileTaggedPet,
    toggleLike
  } = usePetMutations({
    user,
    route,
    session,
    contentMode,
    query,
    activeTags,
    activeSort,
    activeView,
    activeKind,
    galleryMeta,
    creatorMeta,
    setCreatorMeta,
    creatorPets,
    collectionPets,
    adminCollections,
    apiFetch,
    setAuthStatus,
    setPets,
    setMinePets,
    setFavoritePets,
    setCreatorPets,
    setDetailPet,
    setCollectionPets,
    setSharingPet,
    setCreator,
    setCollections,
    setAdminCollections,
    setCollectionDetail,
    loadCollections,
    refreshRoutePetLists,
    loadCreator,
    loadCreators,
    removePetFromGallery,
    openAuth
  });
  const {
    adminStatus,
    setAdminStatus,
    adminModerationBusy,
    adminCollectionBusySlug,
    shadowbanBusyOwnerId,
    nsfwBusyId,
    setAdminUserShadowban,
    removeAdminUser,
    createCollection,
    updateCollection,
    deleteCollection,
    toggleOwnerShadowban,
    togglePetNsfw
  } = useAdminActions({
    user,
    session,
    route,
    contentMode,
    apiFetch,
    setAuthStatus,
    setPets,
    setMinePets,
    setFavoritePets,
    setCreatorPets,
    setDetailPet,
    setSharingPet,
    setCreator,
    loadAdminCollections,
    loadCollections,
    refreshPrimaryPetLists,
    refreshRoutePetLists,
    replacePet
  });
  const {
    uploadState,
    uploadStatus,
    uploadBusy,
    setUploadState,
    setUploadStatus,
    submitUpload
  } = useUploadWorkflow({ apiFetch, refresh });
  const {
    tagEditorPet,
    tagEditorTags,
    tagEditorKind,
    tagEditorStatus,
    tagEditorBusy,
    setTagEditorKind,
    openTagEditor,
    closeTagEditor,
    toggleTagEditorTag,
    submitTagEditor,
    collectionEditorPet,
    collectionEditorSlugs,
    collectionEditorStatus,
    collectionEditorBusy,
    openCollectionEditor,
    closeCollectionEditor,
    toggleCollectionEditorSlug,
    submitCollectionEditor
  } = usePetEditors({
    user,
    adminCollections,
    setAdminCollections,
    apiFetch,
    reconcileTaggedPet,
    reconcilePetCollections
  });
  async function refreshAfterAuth(nextUser: User, nextSession: AuthSession) {
    await refreshAfterAuthRoute({
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
    });
  }

  async function refreshAfterSettings(nextUser: User) {
    await refreshPrimaryPetLists(session, nextUser);
    setDetailPet((current) =>
      current?.ownerId === nextUser.id ? { ...current, ownerName: nextUser.displayName } : current
    );
  }

  async function refresh(authSession = session) {
    await refreshAppSession({
      authSession,
      route,
      refreshSession,
      loadMe,
      loadAdminCollections,
      setAuthStatus
    });
  }

  useAppRouteEffects({
    route,
    setRoute,
    session,
    user,
    playgroundPet,
    refresh,
    loadCollections,
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
    loadCreators,
    setCollectionDetail,
    setCollectionPets,
    loadCollectionDetail,
    loadAdminCollections,
    setAdminStatus
  });

  const { selectContentMode, selectCreatorPage, logout } = useAppNavigationActions({
    route,
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
    loadCollectionDetail
  });

  const viewProps = {
    nav: { route, user, onLogout: logout, onSignIn: openAuth, onAccount: openSettings },
    routes: {
      route, user, session, pets, galleryMeta, loading, query, activeTags, activeSort, activeView, activeKind,
      contentMode, deletingPetId, shadowbanBusyOwnerId, nsfwBusyId, collections, setQuery, selectTag,
      clearTags, selectSort, selectView, selectKind, selectContentMode, selectPage, randomizeGallery,
      submitSearch, likeBusyId, toggleLike, setSharingPet, setPlaygroundPet, setDownloadPet,
      selectVisibleTag, openTagEditor, openCollectionEditor, togglePetNsfw, toggleOwnerShadowban,
      deleteUpload, openAuth, favoritePets, favoritesLoading, minePets, mineLoading, deleteStatus,
      uploadState, uploadStatus, uploadBusy, setUploadState, setUploadStatus, submitUpload, creators,
      creatorsTotal, creatorsLoading, collectionsLoading, setAuthMode, setSharingEntity, collectionDetail,
      collectionPets, collectionDetailLoading, adminCollections, adminCollectionsLoading,
      adminCollectionBusySlug, adminModerationBusy, adminStatus, setAdminUserShadowban, removeAdminUser,
      createCollection, updateCollection, deleteCollection, creator, creatorPets, creatorMeta,
      creatorLoading, selectCreatorPage, detailLoading, detailPet, morePets
    },
    dialogs: {
      authOpen, authMode, selectAuthMode, displayName, setDisplayName, email, setEmail, password,
      setPassword, authStatus, authBusy, submitAuth, closeAuth, settingsOpen, settingsDisplayName,
      setSettingsDisplayName, settingsStatus, settingsBusy, submitSettings, closeSettings, sharingPet,
      setSharingPet, sharingEntity, setSharingEntity, downloadPet, setDownloadPet, tagEditorPet,
      tagEditorTags, tagEditorKind, tagEditorStatus, tagEditorBusy, setTagEditorKind, toggleTagEditorTag,
      submitTagEditor, closeTagEditor, collectionEditorPet, adminCollections, collectionEditorSlugs,
      collectionEditorStatus, collectionEditorBusy, toggleCollectionEditorSlug, submitCollectionEditor,
      closeCollectionEditor
    },
    playground: {
      route, user, session, playgroundPet, favoritePets, collections, setPlaygroundPet, setAuthMode, apiFetch
    }
  } satisfies AppViewProps;

  return <AppView {...viewProps} />;
}

export default App;
