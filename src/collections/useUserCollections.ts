import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { readJson } from "../domain/http";
import { normalizePet } from "../domain/pets";
import { navigate } from "../domain/routing";
import type { AuthSession, CollectionSummary, ContentMode, GalleryResponse, Pet, Route, User } from "../domain/types";

type ApiFetch = (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;

type CollectionEditorState = {
  mode: "create" | "edit";
  collection: CollectionSummary | null;
  displayName: string;
};

export type CollectionPetAdderState = {
  collection: Omit<CollectionSummary, "topPets">;
  query: string;
  results: Pet[];
  total: number;
  searched: boolean;
};

export function useUserCollections({
  user,
  session,
  route,
  contentMode,
  apiFetch,
  userCollections,
  setUserCollections,
  setCollectionDetail,
  setCollectionPets,
  loadUserCollections,
  loadCollectionDetail,
  openAuth
}: {
  user: User | null;
  session: AuthSession | null;
  route: Route;
  contentMode: ContentMode;
  apiFetch: ApiFetch;
  userCollections: CollectionSummary[];
  setUserCollections: Dispatch<SetStateAction<CollectionSummary[]>>;
  setCollectionDetail: Dispatch<SetStateAction<Omit<CollectionSummary, "topPets"> | null>>;
  setCollectionPets: Dispatch<SetStateAction<Pet[]>>;
  loadUserCollections: (currentUser?: User | null, authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  loadCollectionDetail: (slug: string, authSession?: AuthSession | null, content?: ContentMode) => Promise<void>;
  openAuth: () => void;
}) {
  const [collectionEditor, setCollectionEditor] = useState<CollectionEditorState | null>(null);
  const [collectionEditorStatus, setCollectionEditorStatus] = useState("");
  const [collectionEditorBusy, setCollectionEditorBusy] = useState(false);
  const [collectPet, setCollectPet] = useState<Pet | null>(null);
  const [collectSelectedSlugs, setCollectSelectedSlugs] = useState<string[]>([]);
  const [collectNewName, setCollectNewName] = useState("");
  const [collectStatus, setCollectStatus] = useState("");
  const [collectBusy, setCollectBusy] = useState(false);
  const [collectionPetAdder, setCollectionPetAdder] = useState<CollectionPetAdderState | null>(null);
  const [collectionPetAdderStatus, setCollectionPetAdderStatus] = useState("");
  const [collectionPetAdderLoading, setCollectionPetAdderLoading] = useState(false);
  const [collectionPetAdderBusyId, setCollectionPetAdderBusyId] = useState("");

  function openCollectionCreator() {
    if (!user) {
      openAuth();
      return;
    }
    setCollectionEditor({ mode: "create", collection: null, displayName: "" });
    setCollectionEditorStatus("");
    setCollectionEditorBusy(false);
  }

  function openCollectionEditor(collection: CollectionSummary) {
    setCollectionEditor({ mode: "edit", collection, displayName: collection.displayName });
    setCollectionEditorStatus("");
    setCollectionEditorBusy(false);
  }

  function closeCollectionEditor() {
    if (collectionEditorBusy) return;
    setCollectionEditor(null);
    setCollectionEditorStatus("");
  }

  async function submitCollectionEditor(event: FormEvent) {
    event.preventDefault();
    if (!collectionEditor || collectionEditorBusy || !user) return;
    const displayName = collectionEditor.displayName.trim();
    if (!displayName) {
      setCollectionEditorStatus("Name the collection.");
      return;
    }
    setCollectionEditorBusy(true);
    setCollectionEditorStatus("");
    try {
      if (collectionEditor.mode === "create") {
        const body = await readJson<{ collection: CollectionSummary }>(await apiFetch("/api/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName, petIds: [] })
        }, session));
        const collection = normalizeCollection(body.collection);
        setUserCollections((current) => [collection, ...current]);
        setCollectionEditor(null);
        navigate(`#/collections/${collection.slug}`);
      } else if (collectionEditor.collection) {
        const petIds = collectionEditor.collection.petIds || [];
        const body = await readJson<{ collection: CollectionSummary }>(await apiFetch(`/api/collections/${collectionEditor.collection.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName, petIds })
        }, session));
        const collection = normalizeCollection(body.collection);
        replaceUserCollection(collection);
        if (route.name === "collection" && route.slug === collection.slug) {
          setCollectionDetail(collection);
        }
        setCollectionEditor(null);
      }
    } catch (error) {
      setCollectionEditorStatus(error instanceof Error ? error.message : "Could not save collection.");
    } finally {
      setCollectionEditorBusy(false);
    }
  }

  function setCollectionEditorDisplayName(displayName: string) {
    setCollectionEditor((current) => current ? { ...current, displayName } : current);
  }

  function openPetCollector(pet: Pet) {
    if (!user) {
      openAuth();
      return;
    }
    setCollectPet(pet);
    setCollectSelectedSlugs(userCollections
      .filter((collection) => collection.petIds?.includes(pet.id))
      .map((collection) => collection.slug));
    setCollectNewName("");
    setCollectStatus("");
    setCollectBusy(false);
  }

  function closePetCollector() {
    if (collectBusy) return;
    setCollectPet(null);
    setCollectSelectedSlugs([]);
    setCollectNewName("");
    setCollectStatus("");
  }

  function toggleCollectSlug(slug: string) {
    setCollectSelectedSlugs((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
    );
  }

  async function submitPetCollector(event: FormEvent) {
    event.preventDefault();
    if (!collectPet || collectBusy || !user) return;
    const newCollectionName = collectNewName.trim();
    if (!userCollections.length && !newCollectionName) {
      setCollectStatus("Name a collection to add this pet.");
      return;
    }
    setCollectBusy(true);
    setCollectStatus("");
    try {
      const selected = new Set(collectSelectedSlugs);
      for (const collection of userCollections) {
        const petIds = collection.petIds || [];
        const hasPet = petIds.includes(collectPet.id);
        const shouldHavePet = selected.has(collection.slug);
        if (hasPet === shouldHavePet) continue;
        const nextPetIds = shouldHavePet ? [...petIds, collectPet.id] : petIds.filter((petId) => petId !== collectPet.id);
        await readJson<{ collection: CollectionSummary }>(await apiFetch(`/api/collections/${collection.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ petIds: nextPetIds })
        }, session));
      }
      if (newCollectionName) {
        await readJson<{ collection: CollectionSummary }>(await apiFetch("/api/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: newCollectionName, petIds: [collectPet.id] })
        }, session));
      }
      await loadUserCollections(user, session, contentMode);
      if (route.name === "collection") {
        await loadCollectionDetail(route.slug, session, contentMode);
      }
      setCollectPet(null);
      setCollectSelectedSlugs([]);
      setCollectNewName("");
      setCollectStatus("");
    } catch (error) {
      setCollectStatus(error instanceof Error ? error.message : "Could not save collections.");
    } finally {
      setCollectBusy(false);
    }
  }

  function openCollectionPetAdder(collection: Omit<CollectionSummary, "topPets">) {
    if (!user) {
      openAuth();
      return;
    }
    setCollectionPetAdder({
      collection,
      query: "",
      results: [],
      total: 0,
      searched: false
    });
    setCollectionPetAdderStatus("");
    setCollectionPetAdderLoading(false);
    setCollectionPetAdderBusyId("");
  }

  function closeCollectionPetAdder() {
    if (collectionPetAdderLoading || collectionPetAdderBusyId) return;
    setCollectionPetAdder(null);
    setCollectionPetAdderStatus("");
  }

  function setCollectionPetAdderQuery(query: string) {
    setCollectionPetAdder((current) => current ? { ...current, query } : current);
  }

  async function searchCollectionPetAdder(event: FormEvent) {
    event.preventDefault();
    if (!collectionPetAdder || collectionPetAdderLoading) return;
    setCollectionPetAdderLoading(true);
    setCollectionPetAdderStatus("");
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "60");
      const query = collectionPetAdder.query.trim();
      if (query) {
        params.set("q", query);
      }
      if (contentMode === "all") {
        params.set("content", "all");
      }
      const body = await readJson<GalleryResponse>(await apiFetch(`/api/pets?${params}`, {}, session));
      setCollectionPetAdder((current) => current ? {
        ...current,
        results: body.pets.map(normalizePet),
        total: body.total,
        searched: true
      } : current);
    } catch (error) {
      setCollectionPetAdderStatus(error instanceof Error ? error.message : "Could not search pets.");
    } finally {
      setCollectionPetAdderLoading(false);
    }
  }

  async function addPetToCollection(pet: Pet) {
    if (!collectionPetAdder || !user || collectionPetAdderBusyId) return;
    const petIds = collectionPetAdder.collection.petIds;
    if (!petIds) {
      setCollectionPetAdderStatus("Collection data is not ready.");
      return;
    }
    if (petIds.includes(pet.id)) return;
    setCollectionPetAdderBusyId(pet.id);
    setCollectionPetAdderStatus("");
    try {
      const body = await readJson<{ collection: CollectionSummary }>(await apiFetch(`/api/collections/${collectionPetAdder.collection.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petIds: [...petIds, pet.id] })
      }, session));
      const collection = normalizeCollection(body.collection);
      replaceUserCollection(collection);
      setCollectionDetail(collection);
      setCollectionPetAdder((current) => current ? { ...current, collection } : current);
      await Promise.all([
        loadUserCollections(user, session, contentMode),
        route.name === "collection" && route.slug === collection.slug
          ? loadCollectionDetail(route.slug, session, contentMode)
          : Promise.resolve()
      ]);
      setCollectionPetAdderStatus(`Added ${pet.displayName}.`);
    } catch (error) {
      setCollectionPetAdderStatus(error instanceof Error ? error.message : "Could not add pet.");
    } finally {
      setCollectionPetAdderBusyId("");
    }
  }

  async function removePetFromCollection(collection: Omit<CollectionSummary, "topPets">, pet: Pet) {
    if (!user) return;
    if (!collection.petIds) return;
    const petIds = collection.petIds.filter((petId) => petId !== pet.id);
    const body = await readJson<{ collection: CollectionSummary }>(await apiFetch(`/api/collections/${collection.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petIds })
    }, session));
    const next = normalizeCollection(body.collection);
    replaceUserCollection(next);
    if (route.name === "collection" && route.slug === collection.slug) {
      setCollectionDetail(next);
      setCollectionPets((current) => current.filter((item) => item.id !== pet.id));
    }
  }

  async function deleteUserCollection(collection: CollectionSummary) {
    if (!user) return;
    const confirmed = window.confirm(`Delete ${collection.displayName}?`);
    if (!confirmed) return;
    await readJson<{ ok: true }>(await apiFetch(`/api/collections/${collection.slug}`, { method: "DELETE" }, session));
    setUserCollections((current) => current.filter((item) => item.slug !== collection.slug));
    if (route.name === "collection" && route.slug === collection.slug) {
      navigate("#/collections");
    }
  }

  async function startCollectionRoom(collection: Omit<CollectionSummary, "topPets"> & { topPets?: CollectionSummary["topPets"] }, petId?: string) {
    if (!user) {
      openAuth();
      return;
    }
    const hostPetId = petId || collection.petIds?.[0] || collection.topPets?.[0]?.id;
    if (!hostPetId) return;
    const body = await readJson<{ id: string }>(await apiFetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pet_id: hostPetId,
        display_name: collection.displayName,
        collection_slug: collection.slug
      })
    }, session));
    navigate(`#/rooms/${body.id}`);
  }

  function replaceUserCollection(collection: CollectionSummary) {
    setUserCollections((current) => current.map((item) => item.slug === collection.slug ? collection : item));
  }

  return {
    collectionEditor,
    collectionEditorStatus,
    collectionEditorBusy,
    setCollectionEditorDisplayName,
    openCollectionCreator,
    openCollectionEditor,
    closeCollectionEditor,
    submitCollectionEditor,
    collectPet,
    collectSelectedSlugs,
    collectNewName,
    collectStatus,
    collectBusy,
    setCollectNewName,
    openPetCollector,
    closePetCollector,
    toggleCollectSlug,
    submitPetCollector,
    collectionPetAdder,
    collectionPetAdderStatus,
    collectionPetAdderLoading,
    collectionPetAdderBusyId,
    setCollectionPetAdderQuery,
    openCollectionPetAdder,
    closeCollectionPetAdder,
    searchCollectionPetAdder,
    addPetToCollection,
    removePetFromCollection,
    deleteUserCollection,
    startCollectionRoom
  };
}

function normalizeCollection(collection: CollectionSummary): CollectionSummary {
  return {
    ...collection,
    topPets: collection.topPets.map(normalizePet)
  };
}
