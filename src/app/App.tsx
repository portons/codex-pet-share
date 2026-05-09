import { useEffect, useState, type SetStateAction } from "react";
import { useAdminActions } from "../admin/useAdminActions";
import { useAppEntityData } from "./useAppEntityData";
import { useAppNavigationActions } from "./useAppNavigationActions";
import { useAppRouteEffects } from "./useAppRouteEffects";
import { AppView, type AppViewProps } from "./AppView";
import { useSessionApi } from "./useSessionApi";
import { useAuthForms } from "../auth/useAuthForms";
import { navigate, routeFromHash } from "../domain/routing";
import { readJson } from "../domain/http";
import { useUploadWorkflow } from "../uploads/useUploadWorkflow";
import { usePetEditors } from "../pets/usePetEditors";
import { usePetMutations } from "../pets/usePetMutations";
import { useGalleryBrowser } from "../gallery/useGalleryBrowser";
import { useUserCollections } from "../collections/useUserCollections";
import { useTheme } from "./useTheme";
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
  const { theme, toggleTheme } = useTheme();
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
    freshPetCount,
    showFreshPets,
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
    userCollections,
    setUserCollections,
    adminCollections,
    setAdminCollections,
    collectionDetail,
    setCollectionDetail,
    collectionPets,
    setCollectionPets,
    collectionMeta,
    setCollectionMeta,
    detailLoading,
    mineLoading,
    favoritesLoading,
    creatorLoading,
    creatorsLoading,
    collectionsLoading,
    userCollectionsLoading,
    adminCollectionsLoading,
    collectionDetailLoading,
    loadMine,
    loadFavorites,
    loadDetail,
    loadCreator,
    loadCreators,
    loadCollections,
    loadUserCollections,
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
    resendBusy,
    authProviders,
    startOAuth,
    resendVerification,
    submitAuth,
    openAuth,
    closeAuth,
    settingsOpen,
    settingsDisplayName,
    setSettingsDisplayName,
    settingsCurrentPassword,
    setSettingsCurrentPassword,
    settingsNewPassword,
    setSettingsNewPassword,
    settingsStatus,
    settingsBusy,
    submitSettings,
    openSettings,
    openPasswordReset,
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
    deleteConfirmPet,
    likeBusyId,
    deleteUpload,
    confirmDeleteUpload,
    closeDeleteConfirm,
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
  const userCollectionActions = useUserCollections({
    user,
    session,
    route,
    contentMode,
    apiFetch,
    userCollections,
    setUserCollections,
    setCollectionDetail,
    setCollectionPets,
    loadUserCollections,
    loadCollectionDetail,
    openAuth
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
      loadUserCollections,
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

  useEffect(() => {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (hash.startsWith("auth/reset-password")) {
      const params = new URLSearchParams(hash.split("?")[1] || "");
      const token = params.get("token") || "";
      navigate("/");
      setRoute(routeFromHash());
      if (token) {
        openPasswordReset(token);
      } else {
        openAuth();
        setAuthStatus("Password reset link is invalid.");
      }
      return;
    }
    if (!hash.startsWith("auth/callback")) return;
    const params = new URLSearchParams(hash.split("?")[1] || "");
    const code = params.get("code") || "";
    navigate("/");
    setRoute(routeFromHash());
    if (!code) {
      openAuth();
      setAuthStatus("Authentication link is invalid.");
      return;
    }
    let cancelled = false;
    async function completeAuthCallback() {
      try {
        const body = await readJson<{ user: User; session: AuthSession | null }>(
          await apiFetch(
            "/api/auth/session-code",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code })
            },
            null
          )
        );
        if (cancelled) return;
        if (!body.session) throw new Error("Authentication session was not created.");
        applySession(body.session);
        setUser(body.user);
        await refreshAfterAuth(body.user, body.session);
      } catch (error) {
        if (cancelled) return;
        openAuth();
        setAuthStatus(error instanceof Error ? error.message : "Authentication failed.");
      }
    }
    void completeAuthCallback();
    return () => {
      cancelled = true;
    };
  }, []);

  useAppRouteEffects({
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
    loadCreators,
    setCollectionDetail,
    setCollectionPets,
    setCollectionMeta,
    loadCollectionDetail,
    loadAdminCollections,
    setAdminStatus
  });

  const { selectContentMode, selectCreatorPage, selectCollectionPage, logout } = useAppNavigationActions({
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
    collectionMeta,
    apiFetch,
    applySession,
    setUser,
    setMinePets,
    setFavoritePets,
    setCreatorMeta,
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
  });

  function setEntryAuthMode(next: SetStateAction<"login" | "register">) {
    setAuthMode(typeof next === "function" ? next(authMode === "register" ? "register" : "login") : next);
  }

  const viewProps = {
    nav: { route, user, theme, onLogout: logout, onSignIn: openAuth, onAccount: openSettings, onThemeToggle: toggleTheme },
    routes: {
      route, user, session, pets, galleryMeta, loading, query, activeTags, activeSort, activeView, activeKind,
      contentMode, deletingPetId, shadowbanBusyOwnerId, nsfwBusyId, collections, userCollections,
      userCollectionsLoading, setQuery, selectTag,
      clearTags, selectSort, selectView, selectKind, selectContentMode, selectPage, randomizeGallery,
      freshPetCount, showFreshPets,
      submitSearch, likeBusyId, toggleLike, setSharingPet, setPlaygroundPet, setDownloadPet,
      selectVisibleTag, openTagEditor, openCollectionEditor, togglePetNsfw, toggleOwnerShadowban,
      openPetCollector: userCollectionActions.openPetCollector,
      openCollectionCreator: userCollectionActions.openCollectionCreator,
      openUserCollectionEditor: userCollectionActions.openCollectionEditor,
      openCollectionPetAdder: userCollectionActions.openCollectionPetAdder,
      deleteUserCollection: userCollectionActions.deleteUserCollection,
      removePetFromUserCollection: userCollectionActions.removePetFromCollection,
      startUserCollectionRoom: userCollectionActions.startCollectionRoom,
      deleteUpload, openAuth, favoritePets, favoritesLoading, minePets, mineLoading, deleteStatus,
      uploadState, uploadStatus, uploadBusy, setUploadState, setUploadStatus, submitUpload, creators,
      creatorsTotal, creatorsLoading, collectionsLoading, setAuthMode: setEntryAuthMode, setSharingEntity, collectionDetail,
      collectionPets, collectionMeta, collectionDetailLoading, adminCollections, adminCollectionsLoading,
      adminCollectionBusySlug, adminModerationBusy, adminStatus, setAdminUserShadowban, removeAdminUser,
      createCollection, updateCollection, deleteCollection, creator, creatorPets, creatorMeta,
      creatorLoading, selectCreatorPage, selectCollectionPage, detailLoading, detailPet, morePets
    },
    dialogs: {
      authOpen, authMode, selectAuthMode, displayName, setDisplayName, email, setEmail, password,
      setPassword, authStatus, authBusy, resendBusy, authProviders, startOAuth, resendVerification, submitAuth,
      closeAuth, settingsOpen, settingsDisplayName,
      setSettingsDisplayName, settingsCurrentPassword, setSettingsCurrentPassword, settingsNewPassword,
      setSettingsNewPassword, settingsStatus, settingsBusy, submitSettings, closeSettings, sharingPet,
      setSharingPet, sharingEntity, setSharingEntity, downloadPet, setDownloadPet, tagEditorPet,
      tagEditorTags, tagEditorKind, tagEditorStatus, tagEditorBusy, setTagEditorKind, toggleTagEditorTag,
      submitTagEditor, closeTagEditor, collectionEditorPet, adminCollections, collectionEditorSlugs,
      collectionEditorStatus, collectionEditorBusy, toggleCollectionEditorSlug, submitCollectionEditor,
      closeCollectionEditor, deleteConfirmPet, deleteStatus, deletingPetId, confirmDeleteUpload, closeDeleteConfirm,
      userCollectionEditor: userCollectionActions.collectionEditor,
      userCollectionEditorStatus: userCollectionActions.collectionEditorStatus,
      userCollectionEditorBusy: userCollectionActions.collectionEditorBusy,
      setUserCollectionEditorDisplayName: userCollectionActions.setCollectionEditorDisplayName,
      submitUserCollectionEditor: userCollectionActions.submitCollectionEditor,
      closeUserCollectionEditor: userCollectionActions.closeCollectionEditor,
      collectPet: userCollectionActions.collectPet,
      collectSelectedSlugs: userCollectionActions.collectSelectedSlugs,
      collectNewName: userCollectionActions.collectNewName,
      collectStatus: userCollectionActions.collectStatus,
      collectBusy: userCollectionActions.collectBusy,
      setCollectNewName: userCollectionActions.setCollectNewName,
      toggleCollectSlug: userCollectionActions.toggleCollectSlug,
      submitPetCollector: userCollectionActions.submitPetCollector,
      closePetCollector: userCollectionActions.closePetCollector,
      collectionPetAdder: userCollectionActions.collectionPetAdder,
      collectionPetAdderStatus: userCollectionActions.collectionPetAdderStatus,
      collectionPetAdderLoading: userCollectionActions.collectionPetAdderLoading,
      collectionPetAdderBusyId: userCollectionActions.collectionPetAdderBusyId,
      setCollectionPetAdderQuery: userCollectionActions.setCollectionPetAdderQuery,
      searchCollectionPetAdder: userCollectionActions.searchCollectionPetAdder,
      addPetToCollection: userCollectionActions.addPetToCollection,
      closeCollectionPetAdder: userCollectionActions.closeCollectionPetAdder,
      userCollections
    },
    playground: {
      route, user, session, playgroundPet, favoritePets, collections, setPlaygroundPet, setAuthMode: setEntryAuthMode, apiFetch
    }
  } satisfies AppViewProps;

  return <AppView {...viewProps} />;
}

export default App;
