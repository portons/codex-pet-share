import { useState } from "react";
import { useAuthForms } from "../auth/useAuthForms";
import { useUserCollections } from "../collections/useUserCollections";
import { routeFromHash } from "../domain/routing";
import { useGalleryBrowser } from "../gallery/useGalleryBrowser";
import { refreshAppSession } from "./appRefreshActions";
import { createAppSessionHandlers } from "./appSessionHandlers";
import { buildAppViewProps } from "./appViewProps";
import { AppView } from "./AppView";
import { useAppActions } from "./useAppActions";
import { createQuickCommentHandlers, useAppDialogs } from "./useAppDialogs";
import { useAppEffects } from "./useAppEffects";
import { useAppEntityData } from "./useAppEntityData";
import { useAppNavigation } from "./useAppNavigation";
import { useSessionApi } from "./useSessionApi";
import { useTheme } from "./useTheme";
import type { Route } from "../domain/types";

export type { CollectionSummary, Pet, User } from "../domain/types";

function App() {
  const [route, setRoute] = useState<Route>(() => routeFromHash());
  const { theme, toggleTheme } = useTheme();
  const { session, user, setUser, apiFetch, applySession, loadMe, refreshSession } = useSessionApi();
  const gallery = useGalleryBrowser({ apiFetch, session, user, route, setRoute });
  const entity = useAppEntityData({
    apiFetch,
    session,
    user,
    route,
    query: gallery.query,
    activeTags: gallery.activeTags,
    activeSort: gallery.activeSort,
    activeView: gallery.activeView,
    activeKind: gallery.activeKind,
    contentMode: gallery.contentMode,
    galleryMeta: gallery.galleryMeta,
    loadGallery: gallery.loadGallery
  });
  const dialogs = useAppDialogs();
  const { handleAccountDeleted, refreshAfterAuth, refreshAfterSettings } = createAppSessionHandlers({
    route,
    setRoute,
    session,
    gallery,
    entity,
    refresh
  });
  const auth = useAuthForms({
    user,
    apiFetch,
    applySession,
    setUser,
    onAuthenticated: refreshAfterAuth,
    onSettingsSaved: refreshAfterSettings,
    onAccountDeleted: handleAccountDeleted
  });
  const actions = useAppActions({ user, route, session, apiFetch, gallery, entity, dialogs, auth, refresh });
  const userCollectionActions = useUserCollections({
    user,
    session,
    route,
    contentMode: gallery.contentMode,
    apiFetch,
    userCollections: entity.userCollections,
    setUserCollections: entity.setUserCollections,
    setCollectionDetail: entity.setCollectionDetail,
    setCollectionPets: entity.setCollectionPets,
    loadUserCollections: entity.loadUserCollections,
    loadCollectionDetail: entity.loadCollectionDetail,
    openAuth: auth.openAuth
  });

  async function refresh(authSession = session) {
    await refreshAppSession({
      authSession,
      route,
      refreshSession,
      loadMe,
      loadAdminCollections: entity.loadAdminCollections,
      setAuthStatus: auth.setAuthStatus
    });
  }

  useAppEffects({
    route,
    setRoute,
    session,
    user,
    apiFetch,
    applySession,
    setUser,
    gallery,
    entity,
    dialogs,
    auth,
    actions,
    refresh,
    refreshAfterAuth
  });

  const navigation = useAppNavigation({ route, user, session, apiFetch, applySession, setUser, gallery, entity });
  const quickComment = createQuickCommentHandlers({
    user,
    route,
    session,
    apiFetch,
    gallery,
    entity,
    dialogs,
    openAuth: auth.openAuth
  });

  const viewProps = buildAppViewProps({
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
  });

  return <AppView {...viewProps} />;
}

export default App;
