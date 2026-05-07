import { useState, type FormEvent } from "react";
import { emptyUpload, isEditablePetKind } from "../domain/config";
import { readJson } from "../domain/http";
import { normalizePet } from "../domain/pets";
import { navigate } from "../domain/routing";
import type { Pet, UploadState } from "../domain/types";
import {
  generatePreviewImage,
  generateShareImage,
  normalizeUploadManifest,
  readUploadManifest,
  uploadManifestFile
} from "./uploadAssets";

export function useUploadWorkflow({
  apiFetch,
  refresh
}: {
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  refresh: () => Promise<void>;
}) {
  const [uploadState, setUploadState] = useState<UploadState>(emptyUpload);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);

  async function submitUpload(event: FormEvent) {
    event.preventDefault();
    if (uploadBusy) return;
    if (!uploadState.manifest || !uploadState.spritesheet) {
      setUploadStatus("Choose pet.json and spritesheet.webp.");
      return;
    }
    if (!isEditablePetKind(uploadState.kind)) {
      setUploadStatus("Choose a kind.");
      return;
    }

    setUploadStatus("");
    setUploadBusy(true);

    const form = new FormData();
    try {
      const manifest = { ...normalizeUploadManifest(await readUploadManifest(uploadState.manifest)), kind: uploadState.kind };
      const [shareImage, previewImage] = await Promise.all([
        generateShareImage(manifest, uploadState.spritesheet),
        generatePreviewImage(uploadState.spritesheet)
      ]);
      form.append("manifest", uploadManifestFile(manifest));
      form.append("spritesheet", uploadState.spritesheet);
      form.append("shareImage", shareImage);
      form.append("previewImage", previewImage);
      form.append("kind", uploadState.kind);
      form.append("tags", JSON.stringify(uploadState.tags));
      const body = await readJson<{ pet: Pet }>(
        await apiFetch("/api/pets", {
          method: "POST",
          body: form
        })
      );
      setUploadState(emptyUpload);
      setUploadStatus("");
      await refresh();
      navigate(`/pets/${normalizePet(body.pet).id}`);
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadBusy(false);
    }
  }

  return {
    uploadState,
    uploadStatus,
    uploadBusy,
    setUploadState,
    setUploadStatus,
    submitUpload
  };
}
