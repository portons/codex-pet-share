import { useState, type Dispatch, type SetStateAction } from "react";
import type { AdminCollection } from "../admin/AdminPage";
import { readJson } from "../domain/http";
import { navigate } from "../domain/routing";
import { collectionTopPets, isNsfwPet, normalizePet, petMatchesGalleryFilters } from "../domain/pets";
import type {
  AuthSession,
  CollectionSummary,
  ContentMode,
  Creator,
  CreatorLeaderboardSort,
  GalleryMeta,
  GallerySort,
  GalleryUrlState,
  GalleryView,
  Pet,
  PetKind,
  Route,
  User
} from "../domain/types";

type ApiFetch = (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;

export function usePetMutations({
  user,
  route,
  session,
  contentMode,
  query,
  activeTags,
  activeSort,
  activeView,
  activeKind,
  galleryMeta,
  creatorMeta,
  setCreatorMeta,
  creatorPets,
  collectionPets,
  adminCollections,
  apiFetch,
  setAuthStatus,
  setPets,
  setMinePets,
  setFavoritePets,
  setCreatorPets,
  setDetailPet,
  setCollectionPets,
  setSharingPet,
  setCreator,
  setCollections,
  setAdminCollections,
  setCollectionDetail,
  loadCollections,
  refreshRoutePetLists,
  loadCreator,
  loadCreators,
  removePetFromGallery,
  openAuth
}: {
  user: User | null;
  route: Route;
  session: AuthSession | null;
  contentMode: ContentMode;
  query: string;
  activeTags: string[];
  activeSort: GallerySort;
  activeView: GalleryView;
  activeKind: PetKind;
  galleryMeta: GalleryMeta;
  creatorMeta: GalleryMeta;
  setCreatorMeta: Dispatch<SetStateAction<GalleryMeta>>;
  creatorPets: Pet[];
  collectionPets: Pet[];
  adminCollections: AdminCollection[];
  apiFetch: ApiFetch;
  setAuthStatus: Dispatch<SetStateAction<string>>;
  setPets: Dispatch<SetStateAction<Pet[]>>;
  setMinePets: Dispatch<SetStateAction<Pet[]>>;
  setFavoritePets: Dispatch<SetStateAction<Pet[]>>;
  setCreatorPets: Dispatch<SetStateAction<Pet[]>>;
  setDetailPet: Dispatch<SetStateAction<Pet | null>>;
  setCollectionPets: Dispatch<SetStateAction<Pet[]>>;
  setSharingPet: Dispatch<SetStateAction<Pet | null>>;
  setCreator: Dispatch<SetStateAction<Creator | null>>;
  setCollections: Dispatch<SetStateAction<CollectionSummary[]>>;
  setAdminCollections: Dispatch<SetStateAction<AdminCollection[]>>;
  setCollectionDetail: Dispatch<SetStateAction<Omit<CollectionSummary, "topPets"> | null>>;
  loadCollections: (authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  refreshRoutePetLists: (authSession?: AuthSession | null, currentUser?: User | null) => Promise<void>;
  loadCreator: (id: string, page?: number, authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadCreators: (authSession?: AuthSession | null, content?: ContentMode, page?: number, sort?: CreatorLeaderboardSort, query?: string) => Promise<void>;
  removePetFromGallery: (petId: string) => void;
  openAuth: () => void;
}) {
  const [deleteStatus, setDeleteStatus] = useState("");
  const [deletingPetId, setDeletingPetId] = useState("");
  const [likeBusyId, setLikeBusyId] = useState("");
  const [deleteConfirmPet, setDeleteConfirmPet] = useState<Pet | null>(null);

  async function deleteUpload(pet: Pet) {
    if (!user || deletingPetId) return;
    setDeleteStatus("");
    setDeleteConfirmPet(pet);
  }

  async function confirmDeleteUpload() {
    const pet = deleteConfirmPet;
    if (!user || deletingPetId || !pet) return;

    setDeleteStatus("");
    setDeletingPetId(pet.id);
    try {
      await readJson<{ ok: true }>(
        await apiFetch(`/api/pets/${pet.id}`, {
          method: "DELETE"
        })
      );
      setPets((current) => current.filter((item) => item.id !== pet.id));
      setMinePets((current) => current.filter((item) => item.id !== pet.id));
      setFavoritePets((current) => current.filter((item) => item.id !== pet.id));
      setCreatorPets((current) => current.filter((item) => item.id !== pet.id));
      setDetailPet((current) => (current?.id === pet.id ? null : current));
      setCollectionPets((current) => current.filter((item) => item.id !== pet.id));
      await loadCollections(session, contentMode);
      await refreshRoutePetLists(session, user);
      setDeleteConfirmPet(null);
      if (route.name === "detail") {
        navigate(user.id === pet.ownerId ? "/mine" : "/");
      }
    } catch (error) {
      setDeleteStatus(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setDeletingPetId("");
    }
  }

  function closeDeleteConfirm() {
    if (!deletingPetId) {
      setDeleteConfirmPet(null);
      setDeleteStatus("");
    }
  }

  function replacePet(nextPet: Pet) {
    const normalized = normalizePet(nextPet);
    const replace = (items: Pet[]) => items.map((item) => (item.id === normalized.id ? normalized : item));
    setPets(replace);
    setMinePets(replace);
    setCreatorPets(replace);
    setCollectionPets(replace);
    setFavoritePets((current) => {
      const without = current.filter((item) => item.id !== normalized.id);
      return normalized.likedByMe ? replace(current.some((item) => item.id === normalized.id) ? current : [normalized, ...without]) : without;
    });
    setDetailPet((current) => (current?.id === normalized.id ? normalized : current));
    setSharingPet((current) => (current?.id === normalized.id ? normalized : current));
  }

  function reconcilePetCollections(pet: Pet, selectedSlugs: Array<string>) {
    const selected = new Set(selectedSlugs);
    const previous = new Set(
      adminCollections
        .filter((collection) => collection.petIds.includes(pet.id))
        .map((collection) => collection.slug)
    );
    setAdminCollections((current) =>
      current.map((collection) => {
        const petIds = collection.petIds.filter((petId) => petId !== pet.id);
        return {
          ...collection,
          petIds: selected.has(collection.slug) ? [...petIds, pet.id] : petIds
        };
      })
    );
    setCollections((current) =>
      current.map((collection) => {
        const topPets = collection.topPets.filter((item) => item.id !== pet.id);
        if (!selected.has(collection.slug)) {
          return {
            ...collection,
            petCount: Math.max(0, collection.petCount - (previous.has(collection.slug) ? 1 : 0)),
            topPets
          };
        }
        return {
          ...collection,
          petCount: collection.petCount + (previous.has(collection.slug) ? 0 : 1),
          topPets: collectionTopPets([...topPets, pet])
        };
      })
    );
    if (route.name === "collection") {
      if (selected.has(route.slug)) {
        setCollectionPets((current) => {
          const without = current.filter((item) => item.id !== pet.id);
          return [...without, pet].sort((left, right) => left.displayName.localeCompare(right.displayName));
        });
        setCollectionDetail((current) => current ? { ...current, petCount: collectionPets.some((item) => item.id === pet.id) ? current.petCount : current.petCount + 1 } : current);
      } else {
        const hadPet = collectionPets.some((item) => item.id === pet.id);
        setCollectionPets((current) => current.filter((item) => item.id !== pet.id));
        if (hadPet) {
          setCollectionDetail((current) => current ? { ...current, petCount: Math.max(0, current.petCount - 1) } : current);
        }
      }
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

  function removePetFromCreator(petId: string) {
    const shouldUpdateMeta = creatorPets.some((pet) => pet.id === petId);
    setCreatorPets((current) => current.filter((item) => item.id !== petId));
    if (shouldUpdateMeta) {
      setCreatorMeta(metaAfterItemRemoval);
    }
  }

  function reconcileTaggedPet(nextPet: Pet) {
    const normalized = normalizePet(nextPet);
    replacePet(normalized);
    if (route.name === "gallery") {
      const state: GalleryUrlState = {
        query,
        tags: activeTags,
        sort: activeSort,
        page: galleryMeta.page,
        view: activeView,
        kind: activeKind,
        content: contentMode
      };
      if (!petMatchesGalleryFilters(normalized, state)) {
        removePetFromGallery(normalized.id);
      }
    }
    if (route.name === "user" && contentMode !== "all" && isNsfwPet(normalized)) {
      removePetFromCreator(normalized.id);
    }
  }

  async function toggleLike(pet: Pet) {
    if (!user) {
      openAuth();
      return;
    }
    if (likeBusyId) return;

    setLikeBusyId(pet.id);
    try {
      const body = await readJson<{ pet: Pet }>(
        await apiFetch(`/api/pets/${pet.id}/like`, {
          method: pet.likedByMe ? "DELETE" : "POST"
        })
      );
      replacePet(body.pet);
      if (route.name === "user") {
        await loadCreator(route.id, creatorMeta.page, session, contentMode);
      }
      if (route.name === "creators") {
        await loadCreators(session, contentMode);
      }
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Like failed.");
    } finally {
      setLikeBusyId("");
    }
  }

  return {
    deleteStatus,
    deletingPetId,
    deleteConfirmPet,
    likeBusyId,
    deleteUpload,
    confirmDeleteUpload,
    closeDeleteConfirm,
    replacePet,
    reconcilePetCollections,
    reconcileTaggedPet,
    toggleLike
  };
}
