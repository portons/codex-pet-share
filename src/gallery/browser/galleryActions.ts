import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { TagName } from "../../domain/config";
import type {
  AuthSession,
  ContentMode,
  GalleryFormat,
  GalleryMeta,
  GallerySort,
  GalleryUrlState,
  GalleryView,
  Pet,
  PetKind,
  Route
} from "../../domain/types";
import type { createGalleryLoaders } from "./galleryLoaders";

export function createGalleryActions({
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
}: {
  session: AuthSession | null;
  route: Route;
  query: string;
  activeTags: string[];
  activeSort: GallerySort;
  activeView: GalleryView;
  activeKind: PetKind;
  activeFormat: GalleryFormat;
  contentMode: ContentMode;
  galleryMeta: GalleryMeta;
  pets: Pet[];
  setPets: Dispatch<SetStateAction<Pet[]>>;
  setGalleryMeta: Dispatch<SetStateAction<GalleryMeta>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  pushGalleryState: (nextState: GalleryUrlState) => void;
  loadGallery: ReturnType<typeof createGalleryLoaders>["loadGallery"];
}) {
  function scrollPageTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    const nextState = { query, tags: activeTags, sort: activeSort, page: 1, view: activeView, kind: activeKind, format: activeFormat, content: contentMode };
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
    const nextState = { query, tags: nextTags, sort: activeSort, page: 1, view: activeView, kind: activeKind, format: activeFormat, content: contentMode };
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
    const nextState = { query, tags: [], sort: activeSort, page: 1, view: activeView, kind: activeKind, format: activeFormat, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, activeView, nextState.kind);
    } finally {
      setLoading(false);
    }
  }

  async function selectSort(sort: GallerySort) {
    const nextState = { query, tags: activeTags, sort, page: 1, view: activeView, kind: activeKind, format: activeFormat, content: contentMode };
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
    const nextState = { query, tags: activeTags, sort: activeSort, page: 1, view, kind: activeKind, format: activeFormat, content: contentMode };
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
    const nextState = { query, tags: activeTags, sort: activeSort, page: 1, view: activeView, kind, format: activeFormat, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, activeView, nextState.kind);
      scrollPageTop();
    } finally {
      setLoading(false);
    }
  }

  async function selectFormat(format: GalleryFormat) {
    if (format === activeFormat) return;
    const nextState = { query, tags: activeTags, sort: activeSort, page: 1, view: activeView, kind: activeKind, format, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, activeView, nextState.kind, nextState.format);
      scrollPageTop();
    } finally {
      setLoading(false);
    }
  }

  async function selectPage(page: number) {
    if (page === galleryMeta.page) return;
    const nextState = { query, tags: activeTags, sort: activeSort, page, view: activeView, kind: activeKind, format: activeFormat, content: contentMode };
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
    const nextState = { query, tags: activeTags, sort: activeSort, page: 1, view: activeView, kind: activeKind, format: activeFormat, content: contentMode };
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
    const nextState = { query, tags: activeTags, sort: "new" as const, page: 1, view: activeView, kind: activeKind, format: activeFormat, content: contentMode };
    pushGalleryState(nextState);
    setLoading(true);
    try {
      await loadGallery(nextState.query, nextState.tags, nextState.sort, nextState.page, session, nextState.content, nextState.view, nextState.kind, nextState.format, true);
      scrollPageTop();
    } finally {
      setLoading(false);
    }
  }

  async function selectVisibleTag(tag: TagName, sourceTags: string[]) {
    const nextContent = tag === "nsfw" || sourceTags.includes("nsfw") ? "all" : contentMode;
    const nextState = { query: "", tags: [tag], sort: activeSort, page: 1, view: activeView, kind: activeKind, format: activeFormat, content: nextContent };
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
  };
}
