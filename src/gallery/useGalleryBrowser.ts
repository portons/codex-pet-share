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
  const freshBaselineRef = useRef<{ key: string; total: number } | null>(null);
  const freshViewer = freshViewerKey(user, session);

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
    kind = activeKind
  ) {
    if (sort === "random") {
      await loadRandomGallery(search, tags, authSession, content, view, kind);
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
    const suffix = params.toString() ? `?${params}` : "";
    const body = await readJson<GalleryResponse>(await apiFetch(`/api/pets${suffix}`, {}, authSession));
    const pageSize = galleryPageSize(view, sort);
    const nextPets = body.pets.map(normalizePet);
    freshBaselineRef.current = { key: freshGalleryKey(search, tags, content, kind, freshViewerKey(user, authSession)), total: body.total };
    setFreshPetCount(0);
    setPets(nextPets);
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
    kind = activeKind
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

    const firstBody = await readJson<GalleryResponse>(
      await apiFetch(`/api/pets?${params}`, {}, authSession)
    );
    const randomPets = firstBody.pets.map(normalizePet);

    freshBaselineRef.current = { key: freshGalleryKey(search, tags, content, kind, freshViewerKey(user, authSession)), total: firstBody.total };
    setFreshPetCount(0);
    setPets(randomPets);
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
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, nextState.view, nextState.kind);
      scrollPageTop();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (route.name !== "gallery") return;
    const key = freshGalleryKey(query, activeTags, contentMode, activeKind, freshViewer);
    const baseline = freshBaselineRef.current;
    let cancelled = false;

    async function fetchFreshTotal() {
      const params = freshGalleryParams(query, activeTags, contentMode, activeKind);
      const body = await readJson<GalleryResponse>(
        await apiFetch(`/api/pets?${params}`, {}, session)
      );
      return body.total;
    }

    async function resetFreshBaseline() {
      const total = await fetchFreshTotal();
      if (cancelled) return;
      freshBaselineRef.current = { key, total };
      setFreshPetCount(0);
    }

    if (!baseline || baseline.key !== key) {
      void resetFreshBaseline().catch(() => {});
      return () => {
        cancelled = true;
      };
    }

    async function checkFreshPets() {
      const total = await fetchFreshTotal();
      if (cancelled) return;
      const currentBaseline = freshBaselineRef.current;
      if (!currentBaseline || currentBaseline.key !== key) return;
      setFreshPetCount(Math.max(0, total - currentBaseline.total));
    }

    const intervalId = window.setInterval(() => {
      void checkFreshPets().catch(() => {});
    }, 20000);
    void checkFreshPets().catch(() => {});
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [route, query, activeTags, contentMode, activeKind, freshViewer, apiFetch, session, galleryMeta.total]);

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

function freshGalleryParams(search: string, tags: string[], content: ContentMode, kind: PetKind) {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("pageSize", "1");
  params.set("freshPollAt", String(Date.now()));
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
