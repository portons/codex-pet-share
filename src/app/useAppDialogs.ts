import { useState } from "react";
import { readJson } from "../domain/http";
import type { useGalleryBrowser } from "../gallery/useGalleryBrowser";
import type { useAppEntityData } from "./useAppEntityData";
import type { useSessionApi } from "./useSessionApi";
import type { useAuthForms } from "../auth/useAuthForms";
import type { AuthSession, EntityShareTarget, Pet, PetComment, Route, User } from "../domain/types";

type GalleryBrowser = ReturnType<typeof useGalleryBrowser>;
type EntityData = ReturnType<typeof useAppEntityData>;
type SessionApi = ReturnType<typeof useSessionApi>;
type AuthForms = ReturnType<typeof useAuthForms>;

export type AppDialogs = ReturnType<typeof useAppDialogs>;

export function useAppDialogs() {
  const [sharingPet, setSharingPet] = useState<Pet | null>(null);
  const [quickCommentPet, setQuickCommentPet] = useState<Pet | null>(null);
  const [quickCommentStatus, setQuickCommentStatus] = useState("");
  const [quickCommentBusy, setQuickCommentBusy] = useState(false);
  const [sharingEntity, setSharingEntity] = useState<EntityShareTarget | null>(null);
  const [downloadPet, setDownloadPet] = useState<Pet | null>(null);
  const [playgroundPet, setPlaygroundPet] = useState<Pet | null>(null);

  return {
    sharingPet,
    setSharingPet,
    quickCommentPet,
    setQuickCommentPet,
    quickCommentStatus,
    setQuickCommentStatus,
    quickCommentBusy,
    setQuickCommentBusy,
    sharingEntity,
    setSharingEntity,
    downloadPet,
    setDownloadPet,
    playgroundPet,
    setPlaygroundPet
  };
}

export function createQuickCommentHandlers({
  user,
  route,
  session,
  apiFetch,
  gallery,
  entity,
  dialogs,
  openAuth
}: {
  user: User | null;
  route: Route;
  session: AuthSession | null;
  apiFetch: SessionApi["apiFetch"];
  gallery: GalleryBrowser;
  entity: EntityData;
  dialogs: AppDialogs;
  openAuth: AuthForms["openAuth"];
}) {
  const {
    quickCommentPet,
    quickCommentBusy,
    setQuickCommentPet,
    setQuickCommentStatus,
    setQuickCommentBusy
  } = dialogs;

  function openQuickComment(pet: Pet) {
    if (!user) {
      openAuth();
      return;
    }
    setQuickCommentPet(pet);
    setQuickCommentStatus("");
  }

  function closeQuickComment() {
    if (quickCommentBusy) return;
    setQuickCommentPet(null);
    setQuickCommentStatus("");
  }

  async function submitQuickComment(body: string) {
    if (!quickCommentPet) return;
    setQuickCommentStatus("");
    setQuickCommentBusy(true);
    try {
      const result = await readJson<{ comment: PetComment; total: number }>(
        await apiFetch(`/api/pets/${quickCommentPet.id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body })
        })
      );
      const withCommentCount = (pet: Pet) => pet.id === quickCommentPet.id ? { ...pet, commentCount: result.total } : pet;
      gallery.setPets((current) => current.map(withCommentCount));
      entity.setMinePets((current) => current.map(withCommentCount));
      entity.setFavoritePets((current) => current.map(withCommentCount));
      entity.setCreatorPets((current) => current.map(withCommentCount));
      entity.setCollectionPets((current) => current.map(withCommentCount));
      entity.setDetailPet((current) => current && current.id === quickCommentPet.id ? withCommentCount(current) : current);
      setQuickCommentPet(null);
      if (route.name === "gallery") {
        await gallery.loadGallery(
          gallery.query,
          gallery.activeTags,
          gallery.activeSort,
          gallery.galleryMeta.page,
          session,
          gallery.contentMode,
          gallery.activeView,
          gallery.activeKind,
          gallery.activeFormat,
          true
        );
      }
    } catch (error) {
      setQuickCommentStatus(error instanceof Error ? error.message : "Could not post comment.");
    } finally {
      setQuickCommentBusy(false);
    }
  }

  return { openQuickComment, closeQuickComment, submitQuickComment };
}
