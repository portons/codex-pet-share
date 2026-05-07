import { useState, type Dispatch, type SetStateAction } from "react";
import { readJson } from "../domain/http";
import { isNsfwPet } from "../domain/pets";
import { navigate } from "../domain/routing";
import type { AuthSession, ContentMode, Creator, Pet, Route, User } from "../domain/types";
import type { AdminCollection, CollectionDraft } from "./AdminPage";

export function useAdminActions({
  user,
  session,
  route,
  contentMode,
  apiFetch,
  setAuthStatus,
  setPets,
  setMinePets,
  setFavoritePets,
  setCreatorPets,
  setDetailPet,
  setSharingPet,
  setCreator,
  loadAdminCollections,
  loadCollections,
  refreshPrimaryPetLists,
  refreshRoutePetLists,
  replacePet
}: {
  user: User | null;
  session: AuthSession | null;
  route: Route;
  contentMode: ContentMode;
  apiFetch: (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;
  setAuthStatus: Dispatch<SetStateAction<string>>;
  setPets: Dispatch<SetStateAction<Pet[]>>;
  setMinePets: Dispatch<SetStateAction<Pet[]>>;
  setFavoritePets: Dispatch<SetStateAction<Pet[]>>;
  setCreatorPets: Dispatch<SetStateAction<Pet[]>>;
  setDetailPet: Dispatch<SetStateAction<Pet | null>>;
  setSharingPet: Dispatch<SetStateAction<Pet | null>>;
  setCreator: Dispatch<SetStateAction<Creator | null>>;
  loadAdminCollections: (authSession?: AuthSession | null, currentUser?: User | null) => Promise<void>;
  loadCollections: (authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  refreshPrimaryPetLists: (authSession?: AuthSession | null, currentUser?: User | null) => Promise<void>;
  refreshRoutePetLists: (authSession?: AuthSession | null, currentUser?: User | null) => Promise<void>;
  replacePet: (nextPet: Pet) => void;
}) {
  const [adminStatus, setAdminStatus] = useState("");
  const [adminModerationBusy, setAdminModerationBusy] = useState(false);
  const [adminCollectionBusySlug, setAdminCollectionBusySlug] = useState("");
  const [shadowbanBusyOwnerId, setShadowbanBusyOwnerId] = useState("");
  const [nsfwBusyId, setNsfwBusyId] = useState("");

  function applyOwnerShadowban(ownerId: string, shadowbanned: boolean) {
    const update = (items: Pet[]) =>
      items.map((item) => (item.ownerId === ownerId ? { ...item, ownerShadowbanned: shadowbanned } : item));
    setPets(update);
    setMinePets(update);
    setFavoritePets(update);
    setCreatorPets(update);
    setDetailPet((current) => (current?.ownerId === ownerId ? { ...current, ownerShadowbanned: shadowbanned } : current));
    setSharingPet((current) => (current?.ownerId === ownerId ? { ...current, ownerShadowbanned: shadowbanned } : current));
    setCreator((current) => (current?.id === ownerId ? { ...current, shadowbanned } : current));
  }

  async function setShadowban(emailOrId: string, shadowbanned: boolean) {
    const body = await readJson<{ user: Creator }>(
      await apiFetch("/api/admin/users/shadowban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrId, shadowbanned })
      })
    );
    applyOwnerShadowban(body.user.id, Boolean(body.user.shadowbanned));
    await refreshRoutePetLists(session, user);
  }

  async function setAdminUserShadowban(emailOrId: string, shadowbanned: boolean) {
    if (adminModerationBusy || !user?.isAdmin) return;
    const target = emailOrId.trim();
    if (!target) {
      setAdminStatus("Email or user id is required.");
      return;
    }
    setAdminStatus("");
    setAdminModerationBusy(true);
    try {
      await setShadowban(target, shadowbanned);
      setAdminStatus(shadowbanned ? "User shadowbanned." : "User unshadowbanned.");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Moderation failed.");
    } finally {
      setAdminModerationBusy(false);
    }
  }

  async function removeAdminUser(emailOrId: string) {
    if (adminModerationBusy || !user?.isAdmin) return;
    const target = emailOrId.trim();
    if (!target) {
      setAdminStatus("Email or user id is required.");
      return;
    }
    if (!window.confirm(`Remove user ${target}?`)) return;

    setAdminStatus("");
    setAdminModerationBusy(true);
    try {
      await readJson<{ ok: true }>(
        await apiFetch("/api/admin/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailOrId: target })
        })
      );
      setAdminStatus("User removed.");
      await refreshPrimaryPetLists(session, user);
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "User removal failed.");
    } finally {
      setAdminModerationBusy(false);
    }
  }

  async function createCollection(draft: CollectionDraft) {
    if (!user?.isAdmin || adminCollectionBusySlug) return;
    setAdminStatus("");
    setAdminCollectionBusySlug("new");
    try {
      await readJson<{ collection: AdminCollection }>(
        await apiFetch("/api/admin/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: draft.displayName, slug: draft.slug })
        })
      );
      await Promise.all([loadAdminCollections(session, user), loadCollections(session, contentMode)]);
      setAdminStatus("Collection created.");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Collection creation failed.");
    } finally {
      setAdminCollectionBusySlug("");
    }
  }

  async function updateCollection(slug: string, draft: CollectionDraft) {
    if (!user?.isAdmin || adminCollectionBusySlug) return;
    setAdminStatus("");
    setAdminCollectionBusySlug(slug);
    try {
      const body = await readJson<{ collection: AdminCollection }>(
        await apiFetch(`/api/admin/collections/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: draft.displayName, slug: draft.slug })
        })
      );
      await Promise.all([loadAdminCollections(session, user), loadCollections(session, contentMode)]);
      if (route.name === "collection" && route.slug === slug && body.collection.slug !== slug) {
        navigate(`/collections/${body.collection.slug}`);
      }
      setAdminStatus("Collection saved.");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Collection save failed.");
    } finally {
      setAdminCollectionBusySlug("");
    }
  }

  async function deleteCollection(collection: AdminCollection) {
    if (!user?.isAdmin || adminCollectionBusySlug) return;
    if (!window.confirm(`Delete ${collection.displayName}?`)) return;
    setAdminStatus("");
    setAdminCollectionBusySlug(collection.slug);
    try {
      await readJson<{ ok: true }>(
        await apiFetch(`/api/admin/collections/${collection.slug}`, {
          method: "DELETE"
        })
      );
      await Promise.all([loadAdminCollections(session, user), loadCollections(session, contentMode)]);
      setAdminStatus("Collection deleted.");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Collection deletion failed.");
    } finally {
      setAdminCollectionBusySlug("");
    }
  }

  async function toggleOwnerShadowban(pet: Pet) {
    if (!user?.isAdmin || !pet.ownerId || shadowbanBusyOwnerId) return;
    const nextShadowbanned = !pet.ownerShadowbanned;
    const action = nextShadowbanned ? "Shadowban" : "Unshadowban";
    if (!window.confirm(`${action} ${pet.ownerName}?`)) return;

    setShadowbanBusyOwnerId(pet.ownerId);
    try {
      await setShadowban(pet.ownerId, nextShadowbanned);
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Moderation failed.");
    } finally {
      setShadowbanBusyOwnerId("");
    }
  }

  async function togglePetNsfw(pet: Pet) {
    if (!user?.isAdmin || nsfwBusyId) return;
    const nextNsfw = !isNsfwPet(pet);
    setNsfwBusyId(pet.id);
    try {
      const body = await readJson<{ pet: Pet }>(
        await apiFetch(`/api/admin/pets/${pet.id}/nsfw`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nsfw: nextNsfw })
        })
      );
      replacePet(body.pet);
      await refreshRoutePetLists(session, user);
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "NSFW update failed.");
    } finally {
      setNsfwBusyId("");
    }
  }

  return {
    adminStatus,
    setAdminStatus,
    adminModerationBusy,
    adminCollectionBusySlug,
    shadowbanBusyOwnerId,
    nsfwBusyId,
    setAdminUserShadowban,
    removeAdminUser,
    createCollection,
    updateCollection,
    deleteCollection,
    toggleOwnerShadowban,
    togglePetNsfw
  };
}
