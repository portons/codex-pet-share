import type { SetStateAction } from "react";
import type { useAuthForms } from "../auth/useAuthForms";
import type { useUserCollections } from "../collections/useUserCollections";
import type { useGalleryBrowser } from "../gallery/useGalleryBrowser";
import type { AppViewProps } from "./AppView";
import type { AppActions } from "./useAppActions";
import type { useAppEntityData } from "./useAppEntityData";
import type { AppDialogs, createQuickCommentHandlers } from "./useAppDialogs";
import type { AppNavigation } from "./useAppNavigation";
import type { useSessionApi } from "./useSessionApi";
import type { AppTheme } from "./useTheme";
import type { AuthSession, Route, User } from "../domain/types";

type GalleryBrowser = ReturnType<typeof useGalleryBrowser>;
type EntityData = ReturnType<typeof useAppEntityData>;
type SessionApi = ReturnType<typeof useSessionApi>;
type AuthForms = ReturnType<typeof useAuthForms>;
type UserCollectionActions = ReturnType<typeof useUserCollections>;
type QuickCommentHandlers = ReturnType<typeof createQuickCommentHandlers>;

/** Maps App's hook results onto the nav/routes/dialogs/playground prop groups AppView renders. */
export function buildAppViewProps({
  route,
  theme,
  toggleTheme,
  user,
  session,
  apiFetch,
  gallery,
  entity,
  dialogs,
  quickComment,
  auth,
  actions,
  userCollectionActions,
  navigation
}: {
  route: Route;
  theme: AppTheme;
  toggleTheme: () => void;
  user: User | null;
  session: AuthSession | null;
  apiFetch: SessionApi["apiFetch"];
  gallery: GalleryBrowser;
  entity: EntityData;
  dialogs: AppDialogs;
  quickComment: QuickCommentHandlers;
  auth: AuthForms;
  actions: AppActions;
  userCollectionActions: UserCollectionActions;
  navigation: AppNavigation;
}): AppViewProps {
  const {
    pets, recentComments, galleryMeta, loading, query, activeTags, activeSort, activeView, activeKind,
    activeFormat, contentMode, setQuery, selectTag, clearTags, selectSort, selectView, selectKind,
    selectFormat, selectPage, randomizeGallery, freshPetCount, showFreshPets, submitSearch, selectVisibleTag
  } = gallery;
  const {
    minePets, favoritePets, detailPet, morePets, creator, creatorPets, creatorMeta, creators, creatorsMeta,
    creatorsSort, creatorsQuery, collections, userCollections, adminCollections, collectionDetail,
    collectionPets, collectionMeta, detailLoading, mineLoading, favoritesLoading, creatorLoading,
    creatorsLoading, collectionsLoading, userCollectionsLoading, adminCollectionsLoading, collectionDetailLoading
  } = entity;
  const {
    sharingPet, setSharingPet, quickCommentPet, quickCommentStatus, quickCommentBusy,
    sharingEntity, setSharingEntity, downloadPet, setDownloadPet, playgroundPet, setPlaygroundPet
  } = dialogs;
  const { openQuickComment, closeQuickComment, submitQuickComment } = quickComment;
  const { petMutations, petComments, commentNotifications, admin, upload, petEditors } = actions;
  const {
    deleteStatus, deletingPetId, deleteConfirmPet, likeBusyId, deleteUpload, confirmDeleteUpload,
    closeDeleteConfirm, toggleLike
  } = petMutations;
  const {
    comments, commentsLoading, commentsBusy, commentsStatus, commentsMeta, loadComments, submitComment,
    deleteComment, toggleReaction
  } = petComments;
  const {
    adminStatus, adminModerationBusy, adminCollectionBusySlug, shadowbanBusyOwnerId, nsfwBusyId,
    setAdminUserShadowban, removeAdminUser, createCollection, updateCollection, deleteCollection,
    toggleOwnerShadowban, togglePetNsfw
  } = admin;
  const { uploadState, uploadStatus, uploadBusy, setUploadState, setUploadStatus, submitUpload } = upload;
  const {
    tagEditorPet, tagEditorDisplayName, tagEditorDescription, tagEditorTags, tagEditorKind, tagEditorStatus,
    tagEditorBusy, setTagEditorDisplayName, setTagEditorDescription, setTagEditorKind, openTagEditor,
    closeTagEditor, toggleTagEditorTag, submitTagEditor, spriteFixerPet, spriteFixerStatus, spriteFixerBusy,
    openSpriteFixer, closeSpriteFixer, submitSpriteFixer, collectionEditorPet, collectionEditorSlugs,
    collectionEditorStatus, collectionEditorBusy, openCollectionEditor, closeCollectionEditor,
    toggleCollectionEditorSlug, submitCollectionEditor
  } = petEditors;
  const {
    authOpen, authMode, selectAuthMode, displayName, setDisplayName, email, setEmail, password, setPassword,
    authStatus, authBusy, resendBusy, authProviders, startOAuth, resendVerification, submitAuth, openAuth,
    closeAuth, settingsOpen, settingsDisplayName, setSettingsDisplayName, settingsCurrentPassword,
    setSettingsCurrentPassword, settingsNewPassword, setSettingsNewPassword, settingsStatus, settingsBusy,
    settingsAvatarStatus, settingsAvatarBusy, settingsAvatarPets, settingsAvatarPetsLoading, apiKeys,
    apiKeysLoading, apiKeyBusy, newApiKeyName, setNewApiKeyName, newApiKeySecret, apiKeyStatus,
    loadSettingsAvatarPets, createApiKey, revokeApiKey, submitSettings, submitAvatar, deleteAccount,
    openSettings, closeSettings, setAuthMode
  } = auth;
  const {
    selectContentMode, selectCreatorPage, selectCreatorsPage, selectCreatorsSort, selectCreatorsQuery,
    selectCollectionPage, logout
  } = navigation;

  function setEntryAuthMode(next: SetStateAction<"login" | "register">) {
    setAuthMode(typeof next === "function" ? next(authMode === "register" ? "register" : "login") : next);
  }

  return {
    nav: {
      route,
      user,
      theme,
      onLogout: logout,
      onSignIn: openAuth,
      onAccount: openSettings,
      onThemeToggle: toggleTheme,
      commentNotifications: {
        notifications: commentNotifications.notifications,
        unreadCount: commentNotifications.unreadCount,
        loading: commentNotifications.loading,
        status: commentNotifications.status,
        onOpen: commentNotifications.openCommentNotification,
        onDismiss: commentNotifications.dismissCommentNotifications
      }
    },
    routes: {
      route, user, session, pets, recentComments, galleryMeta, loading, query, activeTags, activeSort, activeView, activeKind, activeFormat,
      contentMode, deletingPetId, shadowbanBusyOwnerId, nsfwBusyId, collections, userCollections,
      userCollectionsLoading, setQuery, selectTag,
      clearTags, selectSort, selectView, selectKind, selectFormat, selectPage, randomizeGallery,
      freshPetCount, showFreshPets,
      submitSearch, likeBusyId, toggleLike, setSharingPet, setPlaygroundPet, setDownloadPet,
      selectVisibleTag, openTagEditor, openSpriteFixer, openCollectionEditor, togglePetNsfw, toggleOwnerShadowban,
      openPetCollector: userCollectionActions.openPetCollector,
      openCollectionCreator: userCollectionActions.openCollectionCreator,
      openUserCollectionEditor: userCollectionActions.openCollectionEditor,
      openCollectionPetAdder: userCollectionActions.openCollectionPetAdder,
      openQuickComment,
      deleteUserCollection: userCollectionActions.deleteUserCollection,
      removePetFromUserCollection: userCollectionActions.removePetFromCollection,
      startUserCollectionRoom: userCollectionActions.startCollectionRoom,
      deleteUpload, openAuth, favoritePets, favoritesLoading, minePets, mineLoading, deleteStatus,
      uploadState, uploadStatus, uploadBusy, setUploadState, setUploadStatus, submitUpload, creators,
      creatorsMeta, creatorsSort, creatorsQuery, creatorsLoading, collectionsLoading, setAuthMode: setEntryAuthMode, setSharingEntity, collectionDetail,
      collectionPets, collectionMeta, collectionDetailLoading, adminCollections, adminCollectionsLoading,
      adminCollectionBusySlug, adminModerationBusy, adminStatus, setAdminUserShadowban, removeAdminUser,
      createCollection, updateCollection, deleteCollection, creator, creatorPets, creatorMeta,
      creatorLoading, selectCreatorPage, selectCreatorsPage, selectCreatorsSort, selectCreatorsQuery,
      selectCollectionPage, detailLoading, detailPet, morePets, comments, commentsLoading,
      commentsBusy, commentsStatus, commentsMeta, loadComments, submitComment,
      deleteComment, toggleReaction
    },
    dialogs: {
      user, contentMode, selectContentMode,
      authOpen, authMode, selectAuthMode, displayName, setDisplayName, email, setEmail, password,
      setPassword, authStatus, authBusy, resendBusy, authProviders, startOAuth, resendVerification, submitAuth,
      closeAuth, settingsOpen, settingsDisplayName,
      setSettingsDisplayName, settingsCurrentPassword, setSettingsCurrentPassword, settingsNewPassword,
      setSettingsNewPassword, settingsStatus, settingsBusy, settingsAvatarStatus, settingsAvatarBusy,
      settingsAvatarPets, settingsAvatarPetsLoading, apiKeys, apiKeysLoading, apiKeyBusy,
      newApiKeyName, setNewApiKeyName, newApiKeySecret, apiKeyStatus,
      loadSettingsAvatarPets, createApiKey, revokeApiKey, submitSettings, submitAvatar,
      deleteAccount, closeSettings, sharingPet, setSharingPet, quickCommentPet, quickCommentStatus,
      quickCommentBusy, submitQuickComment, closeQuickComment, sharingEntity, setSharingEntity, downloadPet, setDownloadPet, tagEditorPet,
      tagEditorDisplayName, tagEditorDescription, tagEditorTags, tagEditorKind, tagEditorStatus, tagEditorBusy,
      setTagEditorDisplayName, setTagEditorDescription, setTagEditorKind, toggleTagEditorTag,
      submitTagEditor, closeTagEditor, spriteFixerPet, spriteFixerStatus, spriteFixerBusy,
      submitSpriteFixer, closeSpriteFixer, collectionEditorPet, adminCollections, collectionEditorSlugs,
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
}
