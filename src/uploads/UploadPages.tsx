import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { type TagName } from "../domain/config";
import { formatBytes, formatDate } from "../domain/format";
import { navigate } from "../domain/routing";
import type { ContentMode, EditablePetKind, Pet, UploadManifest, UploadState, User } from "../domain/types";
import { EditableKindControls, TagFilters } from "../gallery/GalleryControls";
import { CyclingPetPreview } from "../pets/PetPreview";
import { OwnerLabel, PetStats, PetTags } from "../pets/PetMeta";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { SignInGate } from "../ui/SignInGate";
import { UploadsSkeleton } from "../ui/Skeletons";
import { Spinner } from "../ui/Spinner";
import { FileField } from "./FileField";
import { normalizePetSlug, readSpritesheetVersion, readUploadManifest } from "./uploadAssets";
import { UploadValidationPreview } from "./UploadValidationPreview";

export function YourUploads({
  user,
  pets,
  loading,
  deletingPetId,
  deleteStatus,
  contentMode,
  onEditTags,
  onFixSprites,
  onTagClick,
  onDownload,
  onDelete,
  onSignIn
}: {
  user: User | null;
  pets: Pet[];
  loading: boolean;
  deletingPetId: string;
  deleteStatus: string;
  contentMode: ContentMode;
  onEditTags: (pet: Pet) => void;
  onFixSprites: (pet: Pet) => void;
  onTagClick: (tag: TagName, sourceTags: string[]) => void;
  onDownload: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onSignIn: () => void;
}) {
  if (!user) {
    return (
      <section className="surface">
        <SignInGate label="Sign in to view your uploads." onSignIn={onSignIn} />
      </section>
    );
  }

  return (
    <section className="surface">
      <header className="sectionHeader">
        <div>
          <p className="metaText">{user.displayName}</p>
          <h1>Your uploads</h1>
        </div>
        <a className="btn btnPrimary" href="#/upload">
          <Icon name="upload" size={13} />
          Upload
        </a>
      </header>
      {loading ? (
        <UploadsSkeleton />
      ) : pets.length ? (
        <>
          <table className="uploadsTable card">
            <thead className="uploadsHead">
              <tr>
                <th scope="col">Package</th>
                <th scope="col">Owner</th>
                <th scope="col">Stats</th>
                <th scope="col">Uploaded</th>
                <th scope="col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {pets.map((pet) => (
                <tr className="uploadsRow" key={pet.id}>
                  <td>
                    <div className="uploadsPackage">
                      <button className="rowPreview" type="button" onClick={() => navigate(`/pets/${pet.id}`)}>
                        <CyclingPetPreview pet={pet} size="thumb" transparent />
                      </button>
                      <div className="uploadsName">
                        <h2>{pet.displayName}</h2>
                        <p>{pet.id}</p>
                        <PetTags tags={pet.tags} onTagClick={onTagClick} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <OwnerLabel pet={pet} className="monoText" />
                  </td>
                  <td>
                    <PetStats pet={pet} />
                  </td>
                  <td>
                    <p className="monoText">{formatDate(pet.uploadedAt)}</p>
                  </td>
                  <td>
                    <div className="rowActions">
                      <button className="btn btnSm" type="button" onClick={() => navigate(`/pets/${pet.id}`)}>
                        View
                      </button>
                      <button className="btn btnSm" type="button" onClick={() => onEditTags(pet)}>
                        <Icon name="tag" size={13} />
                        Tags
                      </button>
                      <button
                        className="btn btnSm"
                        type="button"
                        aria-label={`Download ${pet.displayName}`}
                        onClick={() => onDownload(pet)}
                      >
                        <Icon name="download" size={13} />
                      </button>
                      <button
                        className="btn btnSm btnDanger"
                        type="button"
                        disabled={Boolean(deletingPetId)}
                        onClick={() => onDelete(pet)}
                      >
                        <Icon name="trash" size={13} />
                        {deletingPetId === pet.id ? "Deleting" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deleteStatus && (
            <p className="status" role="alert">
              {deleteStatus}
            </p>
          )}
        </>
      ) : (
        <EmptyState text="No uploads yet." />
      )}
    </section>
  );
}

export function UploadPage({
  user,
  uploadState,
  uploadStatus,
  uploadBusy,
  setUploadState,
  setUploadStatus,
  onSubmit,
  onSignIn
}: {
  user: User | null;
  uploadState: UploadState;
  uploadStatus: string;
  uploadBusy: boolean;
  setUploadState: (updater: (current: UploadState) => UploadState) => void;
  setUploadStatus: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onSignIn: () => void;
}) {
  if (!user) {
    return (
      <section className="surface">
        <SignInGate label="Sign in to upload." onSignIn={onSignIn} />
      </section>
    );
  }

  return (
    <section className="surface uploadSurface">
      <header className="sectionHeader">
        <div>
          <p className="metaText">New pet</p>
          <h1>Upload</h1>
        </div>
      </header>
      <form className="uploadForm" onSubmit={onSubmit}>
        <div className="uploadControls card">
          <div className="petFormatGuide uploadFormatGuide" role="note">
            <div className="petFormatGuideCopy">
              <span className="petFormatGuideEyebrow">Choose a Codex format</span>
              <strong>V2 is the new format.</strong>
              <span>Use a 1536×2288 sheet plus <code>spriteVersionNumber: 2</code> for a neutral look and 16 directions. Legacy 1536×1872 v1 pets still work without a version field.</span>
            </div>
            <div className="petFormatGuideBadges" aria-hidden="true">
              <span className="petFormatPill v2">v2 · recommended</span>
              <span className="petFormatPill v1">v1 · supported</span>
            </div>
          </div>
          <FileField
            accept="application/json,.json"
            file={uploadState.manifest}
            help="pet.json"
            icon="package"
            label="pet.json"
            onFile={(file) => setUploadState((current) => ({ ...current, manifest: file }))}
            onInvalidFile={setUploadStatus}
          />
          <FileField
            accept="image/webp,.webp"
            file={uploadState.spritesheet}
            help="spritesheet.webp"
            icon="sheet"
            label="spritesheet.webp"
            onFile={(file) => setUploadState((current) => ({ ...current, spritesheet: file }))}
            onInvalidFile={setUploadStatus}
          />
          <UploadTagPicker
            tags={uploadState.tags}
            kind={uploadState.kind}
            onKind={(kind) => setUploadState((current) => ({ ...current, kind }))}
            onToggle={(tag) =>
              setUploadState((current) => ({
                ...current,
                tags: current.tags.includes(tag)
                  ? current.tags.filter((value) => value !== tag)
                  : [...current.tags, tag]
              }))
            }
          />
          <UploadValidationPreview uploadState={uploadState} />
          <button className="btn btnPrimary btnLg" type="submit" disabled={uploadBusy}>
            {uploadBusy ? <Spinner size={14} /> : <Icon name="upload" size={14} />}
            {uploadBusy ? "Uploading" : "Upload pet"}
          </button>
          {uploadStatus && (
            <p className="status" role="alert">
              {uploadStatus}
            </p>
          )}
        </div>
        <UploadLivePreview uploadState={uploadState} />
      </form>
    </section>
  );
}

function UploadLivePreview({ uploadState }: { uploadState: UploadState }) {
  const { manifest, manifestError } = useUploadManifestPreview(uploadState.manifest);
  const { spritesheetVersion, spritesheetError } = useUploadSpritesheetPreview(uploadState.spritesheet);
  const spritesheetUrl = useObjectUrl(uploadState.spritesheet);
  const normalizedId = manifest ? normalizePetSlug(manifest.id) : "";
  const declaredVersion = manifest?.spriteVersionNumber === 2 ? 2 : 1;
  const resolvedVersion = spritesheetVersion || declaredVersion;
  const versionMismatch = Boolean(manifest && spritesheetVersion && declaredVersion !== spritesheetVersion);
  const previewReady = Boolean(
    manifest
    && spritesheetUrl
    && spritesheetVersion
    && !manifestError
    && !spritesheetError
    && !versionMismatch
  );
  const spriteStyle = spritesheetUrl ? {
    backgroundImage: `url("${spritesheetUrl}")`,
    "--upload-atlas-size": `800% ${(resolvedVersion === 2 ? 11 : 9) * 100}%`
  } as CSSProperties : undefined;
  const displayName = manifest?.displayName || "Package preview";
  const description = manifest?.description || "No manifest loaded.";

  return (
    <aside className="uploadPreviewPanel card" aria-label="Upload preview">
      <div className="uploadPreviewHeader">
        <div>
          <span className="fieldLabel">Live package</span>
          <strong>{displayName}</strong>
        </div>
        <span className="uploadPreviewState">
          {versionMismatch ? "Mismatch" : spritesheetError || manifestError ? "Invalid" : previewReady ? "Ready" : "Draft"}
        </span>
      </div>

      <div className="uploadSpriteStage">
        {spritesheetUrl ? (
          <div className="uploadSpriteFrame" style={spriteStyle} />
        ) : (
          <div className="uploadSpriteEmpty">
            <Icon name="sheet" size={22} />
          </div>
        )}
      </div>

      <div className="uploadPreviewCopy">
        <h2>{displayName}</h2>
        <p>{description}</p>
      </div>

      <div className="uploadPreviewMeta">
        <PreviewMetaItem label="pet.json" value={uploadState.manifest ? formatBytes(uploadState.manifest.size) : "missing"} />
        <PreviewMetaItem label="spritesheet" value={uploadState.spritesheet ? formatBytes(uploadState.spritesheet.size) : "missing"} />
        <PreviewMetaItem label="id" value={normalizedId || manifestError || "pending"} />
        <PreviewMetaItem label="kind" value={uploadState.kind} />
        <PreviewMetaItem label="format" value={`v${resolvedVersion}`} />
        <PreviewMetaItem
          label="atlas"
          value={spritesheetVersion ? `1536×${spritesheetVersion === 2 ? 2288 : 1872}` : spritesheetError || "pending"}
        />
      </div>

      <div className="uploadPreviewPills">
        {uploadState.tags.length ? uploadState.tags.map((tag) => <span key={tag}>{tag}</span>) : <span>No tags</span>}
      </div>

      <div className="uploadPreviewStrip" aria-hidden="true">
        {Array.from({ length: 8 }, (_, frame) => (
          <span
            className={spritesheetUrl ? "uploadPreviewStripFrame" : "uploadPreviewStripFrame empty"}
            key={frame}
            style={spritesheetUrl ? { ...spriteStyle, "--upload-frame": frame } as CSSProperties : undefined}
          />
        ))}
      </div>
    </aside>
  );
}

function PreviewMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function useUploadManifestPreview(file: File | null) {
  const [manifest, setManifest] = useState<UploadManifest | null>(null);
  const [manifestError, setManifestError] = useState("");

  useEffect(() => {
    let alive = true;
    if (!file) {
      setManifest(null);
      setManifestError("");
      return;
    }
    readUploadManifest(file)
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
  }, [file]);

  return { manifest, manifestError };
}

function useUploadSpritesheetPreview(file: File | null) {
  const [spritesheetVersion, setSpritesheetVersion] = useState<1 | 2 | null>(null);
  const [spritesheetError, setSpritesheetError] = useState("");

  useEffect(() => {
    let alive = true;
    if (!file) {
      setSpritesheetVersion(null);
      setSpritesheetError("");
      return;
    }
    readSpritesheetVersion(file)
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
  }, [file]);

  return { spritesheetVersion, spritesheetError };
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
}

function UploadTagPicker({
  tags,
  kind,
  onKind,
  onToggle
}: {
  tags: string[];
  kind: EditablePetKind;
  onKind: (kind: EditablePetKind) => void;
  onToggle: (tag: TagName) => void;
}) {
  return (
    <div className="uploadTags">
      <div className="uploadTagSection">
        <span className="fieldLabel">Kind</span>
        <EditableKindControls value={kind} onChange={onKind} />
      </div>
      <div className="uploadTagSection">
        <span className="fieldLabel">Tags</span>
        <TagFilters activeTag={tags} onTag={onToggle} />
      </div>
    </div>
  );
}
