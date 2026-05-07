import { useEffect, useState } from "react";
import { formatBytes } from "../domain/format";
import type { UploadManifest, UploadState } from "../domain/types";
import { ValidationItem } from "../ui/ValidationCard";
import { normalizePetSlug, readUploadManifest } from "./uploadAssets";

export function UploadValidationPreview({ uploadState }: { uploadState: UploadState }) {
  const [manifest, setManifest] = useState<UploadManifest | null>(null);
  const [manifestError, setManifestError] = useState("");

  useEffect(() => {
    let alive = true;
    if (!uploadState.manifest) {
      setManifest(null);
      setManifestError("");
      return;
    }

    readUploadManifest(uploadState.manifest)
      .then((nextManifest) => {
        if (!alive) return;
        setManifest(nextManifest);
        setManifestError("");
      })
      .catch((error) => {
        if (!alive) return;
        setManifest(null);
        setManifestError(error instanceof Error ? error.message : "pet.json is invalid");
      });

    return () => {
      alive = false;
    };
  }, [uploadState.manifest]);

  if (!uploadState.manifest && !uploadState.spritesheet) {
    return null;
  }

  const normalizedId = manifest ? normalizePetSlug(manifest.id) : "";
  const idChanged = Boolean(manifest && normalizedId && normalizedId !== manifest.id);

  return (
    <div className="validationCard compact">
      <ValidationItem label="pet.json" value={uploadState.manifest ? formatBytes(uploadState.manifest.size) : "missing"} />
      {manifestError && <ValidationItem label="manifest" value={manifestError} />}
      {manifest && <ValidationItem label="id" value={manifest.id || "missing"} />}
      {idChanged && <ValidationItem label="upload id" value={normalizedId} />}
      {manifest && !normalizedId && <ValidationItem label="upload id" value="needs letters/numbers" />}
      <ValidationItem
        label="spritesheet.webp"
        value={uploadState.spritesheet ? formatBytes(uploadState.spritesheet.size) : "missing"}
      />
      <ValidationItem label="atlas" value="1536x1872" />
      <ValidationItem label="cells" value="192x208" />
    </div>
  );
}
