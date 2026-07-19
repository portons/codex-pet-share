import type { Dispatch, SetStateAction } from "react";
import type { AuthSession, Route, User } from "../domain/types";
import { createGalleryActions } from "./browser/galleryActions";
import { createGalleryLoaders } from "./browser/galleryLoaders";
import { useFreshPetsNotice } from "./browser/useFreshPetsNotice";
import { useGalleryBrowserState } from "./browser/useGalleryBrowserState";

export function useGalleryBrowser({
  apiFetch,
  session,
  user,
  route,
  setRoute
}: {
  apiFetch: (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;
  session: AuthSession | null;
  user: User | null;
  route: Route;
  setRoute: Dispatch<SetStateAction<Route>>;
}) {
  const {
    pets,
    setPets,
    recentComments,
    setRecentComments,
    galleryMeta,
    setGalleryMeta,
    query,
    setQuery,
    activeTags,
    activeSort,
    activeView,
    activeKind,
    activeFormat,
    contentMode,
    setContentMode,
    loading,
    setLoading,
    applyGalleryState,
    pushGalleryState
  } = useGalleryBrowserState({ route, setRoute });

  const { freshPetCount, resetFreshNotice } = useFreshPetsNotice({
    apiFetch,
    session,
    user,
    route,
    query,
    activeTags,
    contentMode,
    activeKind,
    activeFormat
  });

  const { loadGallery } = createGalleryLoaders({
    apiFetch,
    session,
    query,
    activeTags,
    activeSort,
    activeView,
    activeKind,
    activeFormat,
    contentMode,
    galleryMeta,
    setPets,
    setRecentComments,
    setGalleryMeta,
    resetFreshNotice
  });

  const {
    scrollPageTop,
    submitSearch,
    selectTag,
    clearTags,
    selectSort,
    selectView,
    selectKind,
    selectFormat,
    selectPage,
    randomizeGallery,
    showFreshPets,
    selectVisibleTag,
    removePetFromGallery
  } = createGalleryActions({
    session,
    route,
    query,
    activeTags,
    activeSort,
    activeView,
    activeKind,
    activeFormat,
    contentMode,
    galleryMeta,
    pets,
    setPets,
    setGalleryMeta,
    setLoading,
    pushGalleryState,
    loadGallery
  });

  return {
    pets,
    setPets,
    recentComments,
    galleryMeta,
    setGalleryMeta,
    loading,
    setLoading,
    query,
    setQuery,
    activeTags,
    activeSort,
    activeView,
    activeKind,
    activeFormat,
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
    selectFormat,
    selectPage,
    randomizeGallery,
    freshPetCount,
    showFreshPets,
    selectVisibleTag,
    removePetFromGallery
  };
}
