import {
  defaultGalleryUrlState,
  isContentMode,
  isGalleryFormat,
  isGallerySort,
  isGalleryView,
  isPetKind,
  isTagName,
  storedContentMode
} from "./config";
import type { GalleryUrlState, Route } from "./types";
import type { CreatorLeaderboardSort } from "./types";

function hashParts() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const source = hash || `${window.location.pathname.replace(/^\/?/, "")}${window.location.search}`;
  const [path, search = ""] = source.split("?");
  return { path, params: new URLSearchParams(search) };
}

export function routeFromHash(): Route {
  const { path } = hashParts();
  const cleanPath = path.replace(/\/$/, "");
  if (cleanPath === "mine") {
    return { name: "mine" };
  }
  if (cleanPath === "favorites") {
    return { name: "favorites" };
  }
  if (cleanPath === "upload") {
    return { name: "upload" };
  }
  if (cleanPath === "creators") {
    return { name: "creators" };
  }
  if (cleanPath === "collections") {
    return { name: "collections" };
  }
  if (cleanPath === "privacy" || cleanPath === "terms") {
    return { name: "legal", page: cleanPath };
  }
  if (cleanPath.startsWith("collections/")) {
    const rest = cleanPath.slice("collections/".length);
    // /collections/:slug/play -> permanent collection room. The room is
    // implicit (no playground_rooms row); host election happens client-side
    // off presence joinedAt order.
    if (rest.endsWith("/play")) {
      return { name: "collectionRoom", slug: rest.slice(0, -"/play".length) };
    }
    return { name: "collection", slug: rest };
  }
  if (cleanPath === "admin") {
    return { name: "admin" };
  }
  if (cleanPath.startsWith("pets/")) {
    const { params } = hashParts();
    return { name: "detail", id: cleanPath.slice("pets/".length), commentId: params.get("comment") || undefined };
  }
  if (cleanPath.startsWith("users/")) {
    return { name: "user", id: cleanPath.slice("users/".length) };
  }
  if (cleanPath.startsWith("rooms/")) {
    // Room config (display name, collection) lives on the server row, not
    // in the URL. The id is all the route needs.
    return { name: "room", id: cleanPath.slice("rooms/".length) };
  }
  return { name: "gallery" };
}

export function navigate(hash: string) {
  window.location.hash = hash;
}

export function pushHash(hash: string) {
  window.history.pushState(null, "", `#${hash}`);
}

function parsePositivePage(value: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return 1;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function galleryUrlStateFromHash(): GalleryUrlState {
  const { params } = hashParts();
  const sort = params.get("sort");
  const view = params.get("view");
  const kind = params.get("kind");
  const format = params.get("format");
  const content = params.get("content");
  const contentMode = isContentMode(content) ? content : storedContentMode();
  return {
    query: params.get("q") || "",
    tags: params.getAll("tag").filter(isTagName).filter((tag) => contentMode === "all" || tag !== "nsfw"),
    sort: isGallerySort(sort) ? sort : defaultGalleryUrlState.sort,
    page: parsePositivePage(params.get("page")),
    view: isGalleryView(view) ? view : defaultGalleryUrlState.view,
    kind: isPetKind(kind) ? kind : defaultGalleryUrlState.kind,
    format: isGalleryFormat(format) ? format : defaultGalleryUrlState.format,
    content: contentMode
  };
}

export function creatorPageFromHash() {
  return parsePositivePage(hashParts().params.get("page"));
}

export function creatorsPageFromHash() {
  return parsePositivePage(hashParts().params.get("page"));
}

export function creatorsSortFromHash(): CreatorLeaderboardSort {
  const value = hashParts().params.get("sort");
  if (value === "views" || value === "uploads") return value;
  return "likes";
}

export function creatorsQueryFromHash() {
  return hashParts().params.get("q") || "";
}

export function collectionPageFromHash() {
  return parsePositivePage(hashParts().params.get("page"));
}

export function galleryHash(state: Partial<GalleryUrlState> = {}) {
  const next = { ...defaultGalleryUrlState, ...state };
  const params = new URLSearchParams();
  if (next.query) {
    params.set("q", next.query);
  }
  next.tags.forEach((tag) => params.append("tag", tag));
  if (next.sort !== defaultGalleryUrlState.sort) {
    params.set("sort", next.sort);
  }
  if (next.page !== defaultGalleryUrlState.page) {
    params.set("page", String(next.page));
  }
  if (next.view !== defaultGalleryUrlState.view) {
    params.set("view", next.view);
  }
  if (next.kind !== defaultGalleryUrlState.kind) {
    params.set("kind", next.kind);
  }
  if (next.format !== defaultGalleryUrlState.format) {
    params.set("format", next.format);
  }
  if (next.content !== defaultGalleryUrlState.content) {
    params.set("content", next.content);
  }
  const suffix = params.toString();
  return suffix ? `/?${suffix}` : "/";
}

export function creatorHash(id: string, page = 1) {
  return page > 1 ? `/users/${id}?page=${page}` : `/users/${id}`;
}

export function creatorsHash(sort: CreatorLeaderboardSort = "likes", page = 1, query = "") {
  const params = new URLSearchParams();
  const cleanQuery = query.trim();
  if (cleanQuery) {
    params.set("q", cleanQuery);
  }
  if (sort !== "likes") {
    params.set("sort", sort);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const suffix = params.toString();
  return suffix ? `/creators?${suffix}` : "/creators";
}

export function collectionHash(slug: string, page = 1) {
  return page > 1 ? `/collections/${slug}?page=${page}` : `/collections/${slug}`;
}
