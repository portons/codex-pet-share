import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { galleryPageSize } from "../../domain/config";
import { galleryHash, galleryUrlStateFromHash, pushHash } from "../../domain/routing";
import type {
  ContentMode,
  GalleryFormat,
  GalleryMeta,
  GalleryRecentComment,
  GallerySort,
  GalleryUrlState,
  GalleryView,
  Pet,
  PetKind,
  Route
} from "../../domain/types";

export function useGalleryBrowserState({
  route,
  setRoute
}: {
  route: Route;
  setRoute: Dispatch<SetStateAction<Route>>;
}) {
  const initialGalleryState = useMemo(() => galleryUrlStateFromHash(), []);
  const [pets, setPets] = useState<Pet[]>([]);
  const [recentComments, setRecentComments] = useState<GalleryRecentComment[]>([]);
  const [galleryMeta, setGalleryMeta] = useState<GalleryMeta>({
    page: initialGalleryState.page,
    pageSize: galleryPageSize(initialGalleryState.view, initialGalleryState.sort),
    total: 0,
    totalPages: 0
  });
  const [query, setQuery] = useState(initialGalleryState.query);
  const [activeTags, setActiveTags] = useState<string[]>(initialGalleryState.tags);
  const [activeSort, setActiveSort] = useState<GallerySort>(initialGalleryState.sort);
  const [activeView, setActiveView] = useState<GalleryView>(initialGalleryState.view);
  const [activeKind, setActiveKind] = useState<PetKind>(initialGalleryState.kind);
  const [activeFormat, setActiveFormat] = useState<GalleryFormat>(initialGalleryState.format);
  const [contentMode, setContentMode] = useState<ContentMode>(initialGalleryState.content);
  const [loading, setLoading] = useState(true);

  function applyGalleryState(nextState: GalleryUrlState) {
    setQuery(nextState.query);
    setActiveTags(nextState.tags);
    setActiveSort(nextState.sort);
    setActiveView(nextState.view);
    setActiveKind(nextState.kind);
    setActiveFormat(nextState.format);
    setContentMode(nextState.content);
    setGalleryMeta((current) => ({
      ...current,
      page: nextState.page,
      pageSize: galleryPageSize(nextState.view, nextState.sort)
    }));
  }

  function pushGalleryState(nextState: GalleryUrlState) {
    applyGalleryState(nextState);
    pushHash(galleryHash(nextState));
    if (route.name !== "gallery") {
      setRoute({ name: "gallery" });
    }
  }

  return {
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
  };
}
