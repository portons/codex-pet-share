import type { Dispatch, SetStateAction } from "react";
import { galleryPageSize, galleryRequestTags, randomRequestToken } from "../../domain/config";
import { readJson } from "../../domain/http";
import { normalizePet, normalizeRecentComment } from "../../domain/pets";
import type {
  AuthSession,
  ContentMode,
  GalleryFormat,
  GalleryMeta,
  GalleryRecentComment,
  GalleryResponse,
  GallerySort,
  GalleryView,
  Pet,
  PetKind
} from "../../domain/types";

// Recreated every render so the default arguments always reflect the current
// render's gallery state, matching the closure behavior the loaders had inline.
export function createGalleryLoaders({
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
}: {
  apiFetch: (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;
  session: AuthSession | null;
  query: string;
  activeTags: string[];
  activeSort: GallerySort;
  activeView: GalleryView;
  activeKind: PetKind;
  activeFormat: GalleryFormat;
  contentMode: ContentMode;
  galleryMeta: GalleryMeta;
  setPets: Dispatch<SetStateAction<Pet[]>>;
  setRecentComments: Dispatch<SetStateAction<GalleryRecentComment[]>>;
  setGalleryMeta: Dispatch<SetStateAction<GalleryMeta>>;
  resetFreshNotice: () => void;
}) {
  async function loadGallery(
    search = query,
    tags = activeTags,
    sort = activeSort,
    page = galleryMeta.page,
    authSession = session,
    content = contentMode,
    view = activeView,
    kind = activeKind,
    format = activeFormat,
    forceFresh = false
  ) {
    if (sort === "random") {
      await loadRandomGallery(search, tags, authSession, content, view, kind, format, forceFresh);
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
    if (format !== "all") {
      params.set("version", format === "v2" ? "2" : "1");
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
    setRecentComments(sort === "discussed" ? (body.recentComments || []).map(normalizeRecentComment) : []);
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
    format = activeFormat,
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
    if (format !== "all") {
      params.set("version", format === "v2" ? "2" : "1");
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

  return { loadGallery, loadRandomGallery };
}
