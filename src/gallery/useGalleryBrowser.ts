import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  defaultGalleryUrlState,
  galleryPageSize,
  galleryRequestTags,
  randomRequestToken,
  type TagName
} from "../domain/config";
import { readJson } from "../domain/http";
import { normalizePet } from "../domain/pets";
import { galleryHash, galleryUrlStateFromHash, pushHash } from "../domain/routing";
import type {
  AuthSession,
  ContentMode,
  GalleryMeta,
  GalleryRecentComment,
  GalleryResponse,
  GallerySort,
  GalleryUrlState,
  GalleryView,
  Pet,
  PetKind,
  Route,
  User
} from "../domain/types";

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
  const [contentMode, setContentMode] = useState<ContentMode>(initialGalleryState.content);
  const [loading, setLoading] = useState(true);
  const [freshPetCount, setFreshPetCount] = useState(0);
  const [freshBaselineVersion, setFreshBaselineVersion] = useState(0);
  const freshBaselineRef = useRef<{ key: string; latestUploadedAt: string } | null>(null);
  const freshViewer = freshViewerKey(user, session);

  function resetFreshNotice() {
    freshBaselineRef.current = null;
    setFreshPetCount(0);
    setFreshBaselineVersion((current) => current + 1);
  }

  function applyGalleryState(nextState: GalleryUrlState) {
    setQuery(nextState.query);
    setActiveTags(nextState.tags);
    setActiveSort(nextState.sort);
    setActiveView(nextState.view);
    setActiveKind(nextState.kind);
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

  function scrollPageTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadGallery(
    search = query,
    tags = activeTags,
    sort = activeSort,
    page = galleryMeta.page,
    authSession = session,
    content = contentMode,
    view = activeView,
    kind = activeKind,
    forceFresh = false
  ) {
    if (sort === "random") {
      await loadRandomGallery(search, tags, authSession, content, view, kind, forceFresh);
      return;
    }

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(galleryPageSize(view, sort)));
    if (search) {
      params.set("q", search);
    }
    galleryRequestTags(tags).forEach((tag) => params.append("tag", tag));
    if (sort !== "new") {
      params.set("sort", sort);
    }
    if (kind !== "all") {
      params.set("kind", kind);
    }
    if (content === "all") {
      params.set("content", "all");
    }
    if (forceFresh) {
      params.set("freshPollAt", String(Date.now()));
    }
    const suffix = params.toString() ? `?${params}` : "";
    const body = await readJson<GalleryResponse>(await apiFetch(`/api/pets${suffix}`, {}, authSession));
    const pageSize = galleryPageSize(view, sort);
    const nextPets = body.pets.map(normalizePet);
    resetFreshNotice();
    setPets(nextPets);
    setRecentComments(sort === "discussed" ? body.recentComments || [] : []);
    setGalleryMeta({
      page: body.page,
      pageSize,
      total: body.total,
      totalPages: body.totalPages
    });
  }

  async function loadRandomGallery(
    search = query,
    tags = activeTags,
    authSession = session,
    content = contentMode,
    view = activeView,
    kind = activeKind,
    forceFresh = false
  ) {
    const pageSize = galleryPageSize(view, "random");
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    params.set("sort", "random");
    params.set("random", randomRequestToken());
    if (kind !== "all") {
      params.set("kind", kind);
    }
    if (search) {
      params.set("q", search);
    }
    galleryRequestTags(tags).forEach((tag) => params.append("tag", tag));
    if (content === "all") {
      params.set("content", "all");
    }
    if (forceFresh) {
      params.set("freshPollAt", String(Date.now()));
    }

    const firstBody = await readJson<GalleryResponse>(
      await apiFetch(`/api/pets?${params}`, {}, authSession)
    );
    const randomPets = firstBody.pets.map(normalizePet);

    resetFreshNotice();
    setPets(randomPets);
    setRecentComments([]);
    setGalleryMeta({
      page: 1,
      pageSize,
      total: firstBody.total,
      totalPages: 1
    });
  }

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    const nextState = { query, tags: activeTags, sort: activeSort, page: 1, view: activeView, kind: activeKind, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, activeView, nextState.kind);
    } finally {
      setLoading(false);
    }
  }

  async function selectTag(tag: TagName) {
    const nextTags = activeTags.includes(tag) ? activeTags.filter((item) => item !== tag) : [...activeTags, tag];
    const nextState = { query, tags: nextTags, sort: activeSort, page: 1, view: activeView, kind: activeKind, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, activeView, nextState.kind);
    } finally {
      setLoading(false);
    }
  }

  async function clearTags() {
    if (!activeTags.length) return;
    const nextState = { query, tags: [], sort: activeSort, page: 1, view: activeView, kind: activeKind, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, activeView, nextState.kind);
    } finally {
      setLoading(false);
    }
  }

  async function selectSort(sort: GallerySort) {
    const nextState = { query, tags: activeTags, sort, page: 1, view: activeView, kind: activeKind, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, activeView, nextState.kind);
      scrollPageTop();
    } finally {
      setLoading(false);
    }
  }

  async function selectView(view: GalleryView) {
    if (view === activeView) return;
    const nextState = { query, tags: activeTags, sort: activeSort, page: 1, view, kind: activeKind, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, view, nextState.kind);
      scrollPageTop();
    } finally {
      setLoading(false);
    }
  }

  async function selectKind(kind: PetKind) {
    if (kind === activeKind) return;
    const nextState = { query, tags: activeTags, sort: activeSort, page: 1, view: activeView, kind, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, activeView, nextState.kind);
      scrollPageTop();
    } finally {
      setLoading(false);
    }
  }

  async function selectPage(page: number) {
    if (page === galleryMeta.page) return;
    const nextState = { query, tags: activeTags, sort: activeSort, page, view: activeView, kind: activeKind, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, activeView, nextState.kind);
      scrollPageTop();
    } finally {
      setLoading(false);
    }
  }

  async function randomizeGallery() {
    const nextState = { query, tags: activeTags, sort: activeSort, page: 1, view: activeView, kind: activeKind, content: contentMode };
    setLoading(true);
    try {
      await loadGallery(
        nextState.query,
        nextState.tags,
        nextState.sort,
        nextState.page,
        session,
        nextState.content,
        activeView,
        nextState.kind
      );
      scrollPageTop();
    } finally {
      setLoading(false);
    }
  }

  async function showFreshPets() {
    const nextState = { query, tags: activeTags, sort: "new" as const, page: 1, view: activeView, kind: activeKind, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, nextState.view, nextState.kind, true);
      scrollPageTop();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (route.name !== "gallery") return;
    const key = freshGalleryKey(query, activeTags, contentMode, activeKind, freshViewer);
    let cancelled = false;

    async function fetchFreshSnapshot() {
      const params = freshGalleryParams(query, activeTags, contentMode, activeKind);
      const body = await readJson<GalleryResponse>(
        await apiFetch(`/api/pets?${params}`, {}, session)
      );
      const freshPets = body.pets.map(normalizePet);
      return {
        latestUploadedAt: freshPets[0]?.uploadedAt || "",
        total: body.total,
        pets: freshPets
      };
    }

    async function fetchNewerUploads(uploadedAfter: string) {
      const params = freshGalleryParams(query, activeTags, contentMode, activeKind, uploadedAfter);
      const body = await readJson<GalleryResponse>(
        await apiFetch(`/api/pets?${params}`, {}, session)
      );
      const freshPets = body.pets.map(normalizePet);
      return {
        latestUploadedAt: freshPets[0]?.uploadedAt || "",
        total: body.total
      };
    }

    async function resetFreshBaseline() {
      const snapshot = await fetchFreshSnapshot();
      if (cancelled) return;
      freshBaselineRef.current = { key, latestUploadedAt: snapshot.latestUploadedAt };
      setFreshPetCount(0);
    }

    async function checkFreshPets() {
      const currentBaseline = freshBaselineRef.current;
      if (!currentBaseline || currentBaseline.key !== key) {
        await resetFreshBaseline();
        return;
      }
      const snapshot = currentBaseline.latestUploadedAt
        ? await fetchNewerUploads(currentBaseline.latestUploadedAt)
        : await fetchFreshSnapshot();
      if (cancelled) return;
      if (freshBaselineRef.current !== currentBaseline) return;
      if (!snapshot.latestUploadedAt || !isNewerUpload(snapshot.latestUploadedAt, currentBaseline.latestUploadedAt)) {
        setFreshPetCount(0);
        return;
      }
      setFreshPetCount(snapshot.total);
    }

    const intervalId = window.setInterval(() => {
      void checkFreshPets().catch(() => {});
    }, 60000);
    void checkFreshPets().catch(() => {});
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [route, query, activeTags, contentMode, activeKind, freshViewer, apiFetch, session, freshBaselineVersion]);

  async function selectVisibleTag(tag: TagName, sourceTags: string[]) {
    const nextContent = tag === "nsfw" || sourceTags.includes("nsfw") ? "all" : contentMode;
    const nextState = { query: "", tags: [tag], sort: activeSort, page: 1, view: activeView, kind: activeKind, content: nextContent };
    pushGalleryState(nextState);
    if (route.name !== "gallery") {
      return;
    }
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, activeView, nextState.kind);
    } finally {
      setLoading(false);
    }
  }

  function metaAfterItemRemoval(meta: GalleryMeta) {
    const total = Math.max(0, meta.total - 1);
    return {
      ...meta,
      total,
      totalPages: Math.ceil(total / meta.pageSize)
    };
  }

  function removePetFromGallery(petId: string) {
    const shouldUpdateMeta = pets.some((pet) => pet.id === petId);
    setPets((current) => current.filter((item) => item.id !== petId));
    if (shouldUpdateMeta) {
      setGalleryMeta(metaAfterItemRemoval);
    }
  }

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
  };
}

function freshViewerKey(user: User | null, session: AuthSession | null) {
  if (!user) return session ? "authenticated" : "anonymous";
  return JSON.stringify({
    id: user.id,
    admin: user.isAdmin,
    shadowbanned: user.isShadowbanned
  });
}

function freshGalleryKey(search: string, tags: string[], content: ContentMode, kind: PetKind, viewer: string) {
  return JSON.stringify({
    search,
    tags: galleryRequestTags(tags),
    content,
    kind,
    viewer
  });
}

function freshGalleryParams(search: string, tags: string[], content: ContentMode, kind: PetKind, uploadedAfter?: string) {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("pageSize", "1");
  params.set("sort", "new");
  params.set("freshPollAt", String(Date.now()));
  if (uploadedAfter) {
    params.set("uploadedAfter", uploadedAfter);
  }
  if (search) {
    params.set("q", search);
  }
  galleryRequestTags(tags).forEach((tag) => params.append("tag", tag));
  if (kind !== "all") {
    params.set("kind", kind);
  }
  if (content === "all") {
    params.set("content", "all");
  }
  return params.toString();
}

function isNewerUpload(uploadedAt: string, baselineUploadedAt: string) {
  if (!uploadedAt) return false;
  if (!baselineUploadedAt) return true;
  return Date.parse(uploadedAt) > Date.parse(baselineUploadedAt);
}
