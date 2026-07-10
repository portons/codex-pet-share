import { useEffect, useState } from "react";
import { formatBytes } from "../domain/format";
import type { UploadManifest, UploadState } from "../domain/types";
import { ValidationItem } from "../ui/ValidationCard";
import { spriteSheetHeight, spriteSheetWidth } from "../domain/config";
import { normalizePetSlug, readSpritesheetVersion, readUploadManifest } from "./uploadAssets";

export function UploadValidationPreview({ uploadState }: { uploadState: UploadState }) {
  const [manifest, setManifest] = useState<UploadManifest | null>(null);
  const [manifestError, setManifestError] = useState("");
  const [spritesheetVersion, setSpritesheetVersion] = useState<1 | 2 | null>(null);
  const [spritesheetError, setSpritesheetError] = useState("");

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

  useEffect(() => {
    let alive = true;
    if (!uploadState.spritesheet) {
      setSpritesheetVersion(null);
      setSpritesheetError("");
      return;
    }
    readSpritesheetVersion(uploadState.spritesheet)
      .then((version) => {
        if (!alive) return;
        setSpritesheetVersion(version);
        setSpritesheetError("");
      })
      .catch((error) => {
        if (!alive) return;
        setSpritesheetVersion(null);
        setSpritesheetError(error instanceof Error ? error.message : "spritesheet is invalid");
      });
    return () => {
      alive = false;
    };
  }, [uploadState.spritesheet]);

  if (!uploadState.manifest && !uploadState.spritesheet) {
    return null;
  }

  const normalizedId = manifest ? normalizePetSlug(manifest.id) : "";
  const idChanged = Boolean(manifest && normalizedId && normalizedId !== manifest.id);
  const declaredVersion = manifest?.spriteVersionNumber === 2 ? 2 : 1;
  const versionMismatch = Boolean(manifest && spritesheetVersion && declaredVersion !== spritesheetVersion);

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
      <ValidationItem
        label="atlas"
        value={spritesheetError || (spritesheetVersion
          ? `${spriteSheetWidth}x${spriteSheetHeight(spritesheetVersion)} · v${spritesheetVersion}`
          : `${spriteSheetWidth}x${spriteSheetHeight(1)} or ${spriteSheetWidth}x${spriteSheetHeight(2)}`)}
      />
      {manifest && <ValidationItem label="manifest version" value={`v${manifest.spriteVersionNumber === 2 ? 2 : 1}`} />}
      {versionMismatch && (
        <ValidationItem
          label="version mismatch"
          value={spritesheetVersion === 2 ? "add spriteVersionNumber: 2" : "v2 marker needs a 1536x2288 sheet"}
        />
      )}
      <ValidationItem label="cells" value="192x208" />
    </div>
  );
}
