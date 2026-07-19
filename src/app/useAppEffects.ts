import { useEffect } from "react";
import { readJson } from "../domain/http";
import { navigate, routeFromHash } from "../domain/routing";
import { normalizeUser } from "../domain/users";
import { useAppRouteEffects } from "./useAppRouteEffects";
import type { Dispatch, SetStateAction } from "react";
import type { useAuthForms } from "../auth/useAuthForms";
import type { useGalleryBrowser } from "../gallery/useGalleryBrowser";
import type { AppActions } from "./useAppActions";
import type { useAppEntityData } from "./useAppEntityData";
import type { AppDialogs } from "./useAppDialogs";
import type { useSessionApi } from "./useSessionApi";
import type { AuthSession, Route, User } from "../domain/types";

type GalleryBrowser = ReturnType<typeof useGalleryBrowser>;
type EntityData = ReturnType<typeof useAppEntityData>;
type SessionApi = ReturnType<typeof useSessionApi>;
type AuthForms = ReturnType<typeof useAuthForms>;

/**
 * App's top-level effect group, in the exact order App originally ran them:
 * the one-shot auth callback/reset-link handler, the route-driven data
 * effects, and the detail-page comment loader.
 */
export function useAppEffects({
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
}: {
  route: Route;
  setRoute: Dispatch<SetStateAction<Route>>;
  session: AuthSession | null;
  user: User | null;
  apiFetch: SessionApi["apiFetch"];
  applySession: SessionApi["applySession"];
  setUser: SessionApi["setUser"];
  gallery: GalleryBrowser;
  entity: EntityData;
  dialogs: AppDialogs;
  auth: AuthForms;
  actions: AppActions;
  refresh: (authSession?: AuthSession | null) => Promise<void>;
  refreshAfterAuth: (nextUser: User, nextSession: AuthSession) => Promise<void>;
}) {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (hash.startsWith("auth/reset-password")) {
      const params = new URLSearchParams(hash.split("?")[1] || "");
      const token = params.get("token") || "";
      navigate("/");
      setRoute(routeFromHash());
      if (token) {
        auth.openPasswordReset(token);
      } else {
        auth.openAuth();
        auth.setAuthStatus("Password reset link is invalid.");
      }
      return;
    }
    if (!hash.startsWith("auth/callback")) return;
    const params = new URLSearchParams(hash.split("?")[1] || "");
    const code = params.get("code") || "";
    navigate("/");
    setRoute(routeFromHash());
    if (!code) {
      auth.openAuth();
      auth.setAuthStatus("Authentication link is invalid.");
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
        const nextUser = normalizeUser(body.user);
        applySession(body.session);
        setUser(nextUser);
        await refreshAfterAuth(nextUser, body.session);
      } catch (error) {
        if (cancelled) return;
        auth.openAuth();
        auth.setAuthStatus(error instanceof Error ? error.message : "Authentication failed.");
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
    playgroundPet: dialogs.playgroundPet,
    refresh,
    loadCollections: entity.loadCollections,
    loadUserCollections: entity.loadUserCollections,
    setAuthStatus: auth.setAuthStatus,
    applyGalleryState: gallery.applyGalleryState,
    setLoading: gallery.setLoading,
    loadGallery: gallery.loadGallery,
    setUploadStatus: actions.upload.setUploadStatus,
    loadDetail: entity.loadDetail,
    loadMine: entity.loadMine,
    loadFavorites: entity.loadFavorites,
    setCreator: entity.setCreator,
    setCreatorPets: entity.setCreatorPets,
    setCreatorMeta: entity.setCreatorMeta,
    loadCreator: entity.loadCreator,
    setCreatorsMeta: entity.setCreatorsMeta,
    setCreatorsSort: entity.setCreatorsSort,
    setCreatorsQuery: entity.setCreatorsQuery,
    loadCreators: entity.loadCreators,
    setCollectionDetail: entity.setCollectionDetail,
    setCollectionPets: entity.setCollectionPets,
    setCollectionMeta: entity.setCollectionMeta,
    loadCollectionDetail: entity.loadCollectionDetail,
    loadAdminCollections: entity.loadAdminCollections,
    setAdminStatus: actions.admin.setAdminStatus
  });

  useEffect(() => {
    if (route.name !== "detail") {
      actions.petComments.clearComments();
      return;
    }
    actions.petComments.loadComments(route.id, 1, route.commentId).catch((error) =>
      auth.setAuthStatus(error instanceof Error ? error.message : "failed to load comments")
    );
  }, [route.name, route.name === "detail" ? route.id : "", route.name === "detail" ? route.commentId : "", user?.id, session?.accessToken]);
}
