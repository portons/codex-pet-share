import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { type AdminCollection } from "../admin/AdminPage";
import { isEditablePetKind, type TagName } from "../domain/config";
import { readJson } from "../domain/http";
import { normalizePet } from "../domain/pets";
import type { EditablePetKind, Pet, User } from "../domain/types";
import {
  editPetSpritesheet,
  fetchPetPackageSpritesheet,
  generatePosterImage,
  generatePreviewImage,
  generateShareImage,
  type PetSpriteEditorOperation
} from "../uploads/uploadAssets";

export function usePetEditors({
  user,
  adminCollections,
  setAdminCollections,
  apiFetch,
  reconcileTaggedPet,
  reconcilePetCollections
}: {
  user: User | null;
  adminCollections: AdminCollection[];
  setAdminCollections: Dispatch<SetStateAction<AdminCollection[]>>;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  reconcileTaggedPet: (nextPet: Pet) => void;
  reconcilePetCollections: (pet: Pet, selectedSlugs: Array<string>) => void;
}) {
  const [tagEditorPet, setTagEditorPet] = useState<Pet | null>(null);
  const [tagEditorDisplayName, setTagEditorDisplayName] = useState("");
  const [tagEditorDescription, setTagEditorDescription] = useState("");
  const [tagEditorKind, setTagEditorKind] = useState<EditablePetKind>("object");
  const [tagEditorTags, setTagEditorTags] = useState<string[]>([]);
  const [tagEditorStatus, setTagEditorStatus] = useState("");
  const [tagEditorBusy, setTagEditorBusy] = useState(false);
  const [collectionEditorPet, setCollectionEditorPet] = useState<Pet | null>(null);
  const [collectionEditorSlugs, setCollectionEditorSlugs] = useState<Array<string>>([]);
  const [collectionEditorStatus, setCollectionEditorStatus] = useState("");
  const [collectionEditorBusy, setCollectionEditorBusy] = useState(false);
  const [spriteFixerPet, setSpriteFixerPet] = useState<Pet | null>(null);
  const [spriteFixerStatus, setSpriteFixerStatus] = useState("");
  const [spriteFixerBusy, setSpriteFixerBusy] = useState(false);

  function openTagEditor(pet: Pet) {
    setTagEditorPet(pet);
    setTagEditorDisplayName(pet.displayName);
    setTagEditorDescription(pet.description);
    setTagEditorKind(pet.kind);
    setTagEditorTags(pet.tags);
    setTagEditorStatus("");
    setTagEditorBusy(false);
  }

  function closeTagEditor() {
    if (tagEditorBusy) return;
    setTagEditorPet(null);
    setTagEditorStatus("");
  }

  function toggleTagEditorTag(tag: TagName) {
    if (!user?.isAdmin && tag === "nsfw" && tagEditorPet?.tags.includes("nsfw")) return;
    setTagEditorTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]
    );
  }

  async function submitTagEditor(event: FormEvent) {
    event.preventDefault();
    if (!tagEditorPet || tagEditorBusy) return;
    const displayName = tagEditorDisplayName.trim();
    const description = tagEditorDescription.trim();
    if (!displayName) {
      setTagEditorStatus("Display name is required.");
      return;
    }
    if (!description) {
      setTagEditorStatus("Description is required.");
      return;
    }
    if (!isEditablePetKind(tagEditorKind)) {
      setTagEditorStatus("Choose a kind.");
      return;
    }
    const tags = !user?.isAdmin && tagEditorPet.tags.includes("nsfw") && !tagEditorTags.includes("nsfw")
      ? [...tagEditorTags, "nsfw"]
      : tagEditorTags;
    setTagEditorStatus("");
    setTagEditorBusy(true);
    try {
      const body = await readJson<{ pet: Pet }>(
        await apiFetch(`/api/pets/${tagEditorPet.id}/tags`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName, description, tags, kind: tagEditorKind })
        })
      );
      reconcileTaggedPet(normalizePet(body.pet));
      setTagEditorBusy(false);
      setTagEditorPet(null);
    } catch (error) {
      setTagEditorStatus(error instanceof Error ? error.message : "Could not save tags.");
    } finally {
      setTagEditorBusy(false);
    }
  }

  async function openCollectionEditor(pet: Pet) {
    if (!user?.isAdmin) return;
    const localSlugs = adminCollections
      .filter((collection) => collection.petIds.includes(pet.id))
      .map((collection) => collection.slug);
    setCollectionEditorSlugs(localSlugs);
    setCollectionEditorPet(pet);
    setCollectionEditorStatus("");
    setCollectionEditorBusy(false);
    try {
      const body = await readJson<{ collections: Array<AdminCollection> }>(
        await apiFetch("/api/admin/collections")
      );
      setAdminCollections(body.collections);
      setCollectionEditorSlugs(body.collections.filter((collection) => collection.petIds.includes(pet.id)).map((collection) => collection.slug));
    } catch (error) {
      setCollectionEditorStatus(error instanceof Error ? error.message : "Could not load collections.");
    }
  }

  function closeCollectionEditor() {
    if (collectionEditorBusy) return;
    setCollectionEditorPet(null);
    setCollectionEditorSlugs([]);
    setCollectionEditorStatus("");
  }

  function toggleCollectionEditorSlug(slug: string) {
    setCollectionEditorSlugs((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
    );
  }

  async function submitCollectionEditor(event: FormEvent) {
    event.preventDefault();
    if (!collectionEditorPet || collectionEditorBusy || !user?.isAdmin) return;
    setCollectionEditorStatus("");
    setCollectionEditorBusy(true);
    try {
      const body = await readJson<{ pet: Pet }>(
        await apiFetch(`/api/admin/pets/${collectionEditorPet.id}/collections`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collectionSlugs: collectionEditorSlugs })
        })
      );
      reconcilePetCollections(normalizePet(body.pet), collectionEditorSlugs);
      setCollectionEditorPet(null);
    } catch (error) {
      setCollectionEditorStatus(error instanceof Error ? error.message : "Could not save collections.");
    } finally {
      setCollectionEditorBusy(false);
    }
  }

  function openSpriteFixer(pet: Pet) {
    setSpriteFixerPet(pet);
    setSpriteFixerStatus("");
    setSpriteFixerBusy(false);
  }

  function closeSpriteFixer() {
    if (spriteFixerBusy) return;
    setSpriteFixerPet(null);
    setSpriteFixerStatus("");
  }

  async function submitSpriteFixer(event: FormEvent, operation: PetSpriteEditorOperation) {
    event.preventDefault();
    const pet = spriteFixerPet;
    if (!pet || spriteFixerBusy) return false;
    setSpriteFixerStatus("");
    setSpriteFixerBusy(true);
    try {
      const currentSpritesheet = await fetchPetPackageSpritesheet(pet.downloadUrl);
      const spritesheet = await editPetSpritesheet(currentSpritesheet, operation);
      const manifest = {
        id: pet.id,
        displayName: pet.displayName,
        description: pet.description,
        spritesheetPath: pet.spritesheetPath,
        ...(pet.spriteVersionNumber === 2 ? { spriteVersionNumber: 2 as const } : {}),
        kind: pet.kind
      };
      const [shareImage, previewImage, posterImage] = await Promise.all([
        generateShareImage(manifest, spritesheet),
        generatePreviewImage(spritesheet, pet.spriteVersionNumber),
        generatePosterImage(spritesheet)
      ]);
      const form = new FormData();
      form.append("spritesheet", spritesheet);
      form.append("shareImage", shareImage);
      form.append("previewImage", previewImage);
      form.append("posterImage", posterImage);
      const body = await readJson<{ pet: Pet }>(
        await apiFetch(`/api/pets/${pet.id}/spritesheet`, {
          method: "PATCH",
          body: form
        })
      );
      reconcileTaggedPet(normalizePet(body.pet));
      setSpriteFixerPet(null);
      return true;
    } catch (error) {
      setSpriteFixerStatus(error instanceof Error ? error.message : "Could not save sprites.");
      return false;
    } finally {
      setSpriteFixerBusy(false);
    }
  }

  return {
    tagEditorPet,
    tagEditorDisplayName,
    tagEditorDescription,
    tagEditorTags,
    tagEditorKind,
    tagEditorStatus,
    tagEditorBusy,
    setTagEditorDisplayName,
    setTagEditorDescription,
    setTagEditorKind,
    openTagEditor,
    closeTagEditor,
    toggleTagEditorTag,
    submitTagEditor,
    collectionEditorPet,
    collectionEditorSlugs,
    collectionEditorStatus,
    collectionEditorBusy,
    openCollectionEditor,
    closeCollectionEditor,
    toggleCollectionEditorSlug,
    submitCollectionEditor,
    spriteFixerPet,
    spriteFixerStatus,
    spriteFixerBusy,
    openSpriteFixer,
    closeSpriteFixer,
    submitSpriteFixer
  };
}
