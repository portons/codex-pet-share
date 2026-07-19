import { useEffect, useRef, useState } from "react";
import { galleryRequestTags } from "../../domain/config";
import { readJson } from "../../domain/http";
import { normalizePet } from "../../domain/pets";
import type {
  AuthSession,
  ContentMode,
  GalleryFormat,
  GalleryResponse,
  PetKind,
  Route,
  User
} from "../../domain/types";

export function useFreshPetsNotice({
  apiFetch,
  session,
  user,
  route,
  query,
  activeTags,
  contentMode,
  activeKind,
  activeFormat
}: {
  apiFetch: (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;
  session: AuthSession | null;
  user: User | null;
  route: Route;
  query: string;
  activeTags: string[];
  contentMode: ContentMode;
  activeKind: PetKind;
  activeFormat: GalleryFormat;
}) {
  const [freshPetCount, setFreshPetCount] = useState(0);
  const [freshBaselineVersion, setFreshBaselineVersion] = useState(0);
  const freshBaselineRef = useRef<{ key: string; latestUploadedAt: string } | null>(null);
  const freshViewer = freshViewerKey(user, session);

  function resetFreshNotice() {
    freshBaselineRef.current = null;
    setFreshPetCount(0);
    setFreshBaselineVersion((current) => current + 1);
  }

  useEffect(() => {
    if (route.name !== "gallery") return;
    const key = freshGalleryKey(query, activeTags, contentMode, activeKind, activeFormat, freshViewer);
    let cancelled = false;

    async function fetchFreshSnapshot() {
      const params = freshGalleryParams(query, activeTags, contentMode, activeKind, activeFormat);
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
      const params = freshGalleryParams(query, activeTags, contentMode, activeKind, activeFormat, uploadedAfter);
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
  }, [route, query, activeTags, contentMode, activeKind, activeFormat, freshViewer, apiFetch, session, freshBaselineVersion]);

  return { freshPetCount, resetFreshNotice };
}

function freshViewerKey(user: User | null, session: AuthSession | null) {
  if (!user) return session ? "authenticated" : "anonymous";
  return JSON.stringify({
    id: user.id,
    admin: user.isAdmin,
    shadowbanned: user.isShadowbanned
  });
}

function freshGalleryKey(search: string, tags: string[], content: ContentMode, kind: PetKind, format: GalleryFormat, viewer: string) {
  return JSON.stringify({
    search,
    tags: galleryRequestTags(tags),
    content,
    kind,
    format,
    viewer
  });
}

function freshGalleryParams(search: string, tags: string[], content: ContentMode, kind: PetKind, format: GalleryFormat, uploadedAfter?: string) {
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
  if (format !== "all") {
    params.set("version", format === "v2" ? "2" : "1");
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
