import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { DownloadCommandRow, type DownloadCommandMode } from "../downloads/DownloadCommandRow";
import { trackEvent } from "../domain/analytics";
import { petStates, type TagName } from "../domain/config";
import { isNsfwPet, petCodexInstallUrl, petImportCommand } from "../domain/pets";
import type { ContentMode, Pet, User } from "../domain/types";
import { copyText } from "../ui/clipboard";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";
import { ValidationReportCard } from "../ui/ValidationCard";
import { CursorPetPreview, useCursorPreviewAssets, useCursorPreviewMotion, useCursorPreviewSupport } from "./CursorPreview";
import { AdminPetMenu, PetCard } from "./PetCard";
import { OwnerLabel, PetStats, PetTags } from "./PetMeta";
import { PetSprite } from "./PetPreview";
import { usePetGifExport } from "./usePetGifExport";

export function PetDetail({
  pet,
  user,
  likeBusyId,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  deleteStatus,
  contentMode,
  hasCollections,
  morePets,
  onLike,
  onShare,
  onPlayground,
  onDownload,
  onTagClick,
  onSignIn,
  onEditTags,
  onFixSprites,
  onManageCollections,
  onCollect,
  onToggleNsfw,
  onShadowbanOwner,
  onDelete
}: {
  pet: Pet;
  user: User | null;
  likeBusyId: string;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  deleteStatus: string;
  contentMode: ContentMode;
  hasCollections: boolean;
  morePets: Array<Pet>;
  onLike: (pet: Pet) => void;
  onShare: (pet: Pet) => void;
  onPlayground?: (pet: Pet) => void;
  onDownload: (pet: Pet) => void;
  onTagClick: (tag: TagName, sourceTags: string[]) => void;
  onSignIn: () => void;
  onEditTags: (pet: Pet) => void;
  onFixSprites: (pet: Pet) => void;
  onManageCollections: (pet: Pet) => void;
  onCollect?: (pet: Pet) => void;
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
}) {
  const [activeStateId, setActiveStateId] = useState<(typeof petStates)[number]["id"]>("idle");
  const [cursorPreview, setCursorPreview] = useState(false);
  const [copiedDownloadCommand, setCopiedDownloadCommand] = useState(false);
  const [downloadCommandMode, setDownloadCommandMode] = useState<DownloadCommandMode>("cli");
  const canCursorPreview = useCursorPreviewSupport();
  const cursorPreviewEnabled = cursorPreview && canCursorPreview;
  const cursorPreviewReady = useCursorPreviewAssets(pet, cursorPreviewEnabled);
  const { cursorPoint, cursorStateId, cursorRotationDeg } = useCursorPreviewMotion(cursorPreviewEnabled);
  const activeState = useMemo(
    () => petStates.find((state) => state.id === activeStateId) || petStates[0],
    [activeStateId]
  );
  const { gifExportBusy, gifExportStatus, exportStateGif, exportCurrentStateGif, exportAllStateGifs } = usePetGifExport(pet, activeState);

  useEffect(() => {
    if (!canCursorPreview) {
      setCursorPreview(false);
    }
  }, [canCursorPreview]);

  const specimenId = pet.id.length > 8 ? pet.id.slice(0, 8) : pet.id;
  const canDelete = Boolean(!user?.isAdmin && user?.id && user.id === pet.ownerId);
  const canEditTags = Boolean(!user?.isAdmin && user?.id && user.id === pet.ownerId);
  const canFixSprites = Boolean((user?.isAdmin && pet.ownerId) || (user?.id && user.id === pet.ownerId));
  const hasManagementActions = canFixSprites || canDelete || Boolean(user?.isAdmin);
  const downloadCommand = petImportCommand(pet, downloadCommandMode);
  const codexInstallUrl = petCodexInstallUrl(pet);

  async function copyDownloadCommand() {
    trackEvent("download_command_copy", { route: "detail", petId: pet.id, value: downloadCommandMode, user });
    const copied = await copyText(downloadCommand);
    setCopiedDownloadCommand(copied);
    window.setTimeout(() => setCopiedDownloadCommand(false), 1400);
  }

  function changeDownloadCommandMode(mode: DownloadCommandMode) {
    trackEvent("download_command_mode", { route: "detail", petId: pet.id, value: mode, user });
    setDownloadCommandMode(mode);
    setCopiedDownloadCommand(false);
  }

  function handleLike() {
    trackEvent("detail_like_click", { route: "detail", petId: pet.id, user });
    if (user) {
      onLike(pet);
    } else {
      onSignIn();
    }
  }

  function handleShare() {
    trackEvent("detail_share_click", { route: "detail", petId: pet.id, user });
    onShare(pet);
  }

  function handlePlayground() {
    trackEvent("detail_playground_click", { route: "detail", petId: pet.id, user });
    onPlayground?.(pet);
  }

  function handleCollect() {
    trackEvent("detail_collect_click", { route: "detail", petId: pet.id, user });
    onCollect?.(pet);
  }

  function handleCodexInstall() {
    trackEvent("detail_codex_install_click", { route: "detail", petId: pet.id, user });
  }

  function handleZipDownload() {
    trackEvent("detail_zip_download_click", { route: "detail", petId: pet.id, user });
  }

  return (
    <section className="detailSurface">
      <article className="detailHero">
        <header className="detailHeader">
          <p className="detailSpecimen">
            <span className="detailSpecimenItem">id / <strong>{specimenId}</strong></span>
            <span className="detailSpecimenSep" aria-hidden="true">·</span>
            <span className="detailSpecimenItem">by <OwnerLabel pet={pet} className="detailSpecimenOwner" /></span>
            {isNsfwPet(pet) ? <span className="detailNsfwPill">NSFW</span> : null}
          </p>
          <h1 className="detailTitle">{pet.displayName}</h1>
          {pet.description ? <p className="detailLede">{pet.description}</p> : null}
          {pet.tags.length > 0 ? <PetTags tags={pet.tags} onTagClick={onTagClick} /> : null}
        </header>

        <div className="detailShowcase">
          <PetSprite
            pet={pet}
            row={activeState.row}
            frames={activeState.frames}
            label={activeState.label}
            size="large"
            transparent
          />
          {canCursorPreview ? (
            <button
              className={`detailWalkButton ${cursorPreview ? "active" : ""}`}
              type="button"
              aria-pressed={cursorPreview}
              onClick={() => setCursorPreview(!cursorPreview)}
            >
              <span className="detailWalkButtonGlyph" aria-hidden="true">{cursorPreview ? "✓" : "→"}</span>
              {cursorPreview ? "Walking with you" : "Take it for a walk"}
            </button>
          ) : null}
        </div>

        {hasManagementActions ? (
          <div className="detailCreatorTools" role="group" aria-label="Pet tools">
            <span className="detailCreatorToolsLabel">Pet tools</span>
            <div className="detailCreatorToolsButtons">
              {canFixSprites ? (
                <button className="btn btnSm detailFixSpritesAction" type="button" onClick={() => onFixSprites(pet)}>
                  <Icon name="swap" size={13} />
                  Fix left/right
                </button>
              ) : null}
              {canDelete && (
                <button
                  className="btn btnDanger btnSm"
                  type="button"
                  disabled={Boolean(deletingPetId)}
                  onClick={() => onDelete(pet)}
                >
                  <Icon name="trash" size={13} />
                  {deletingPetId === pet.id ? "Deleting" : "Delete"}
                </button>
              )}
              {user?.isAdmin && (
                <AdminPetMenu
                  pet={pet}
                  deletingPetId={deletingPetId}
                  shadowbanBusyOwnerId={shadowbanBusyOwnerId}
                  nsfwBusyId={nsfwBusyId}
                  onEditTags={onEditTags}
                  onManageCollections={onManageCollections}
                  onToggleNsfw={onToggleNsfw}
                  onShadowbanOwner={onShadowbanOwner}
                  onDelete={onDelete}
                />
              )}
            </div>
          </div>
        ) : null}

        <div className="detailHeroFooter">
          <PetStats pet={pet} size="large" />
          <div className="detailSocialActions" aria-label="Pet actions">
            <button
              className={`btn btnSm likeButton ${pet.likedByMe ? "active" : ""}`}
              type="button"
              disabled={likeBusyId === pet.id}
              onClick={handleLike}
            >
              <Icon name="heart" size={13} />
              {pet.likedByMe ? "Liked" : "Like"}
            </button>
            <button className="btn btnSm" type="button" onClick={handleShare}>
              <Icon name="share" size={13} />
              Share
            </button>
            {onPlayground && (
              <button
                className="btn btnSm"
                type="button"
                onClick={handlePlayground}
                title="3D playground · WASD · shift sprint · space jump · E wave · Q sit · drag rotate · scroll zoom"
                data-tooltip="WASD move · drag rotate · scroll zoom · E wave · Q sit"
              >
                <Icon name="cube" size={13} />
                Playground
              </button>
            )}
            {user && onCollect && (
              <button className="btn btnSm" type="button" onClick={handleCollect}>
                <Icon name="package" size={13} />
                Add to collection
              </button>
            )}
          </div>
        </div>
      </article>

      <article className="detailInstall" aria-label="Install">
        <header className="detailSectionHeader">
          <span className="detailSectionLabel">Codex install</span>
          <span className="detailSectionHint">Ask Codex to install this pet.</span>
        </header>
        <a className="btn btnPrimary btnLg detailInstallPrimary" href={codexInstallUrl} onClick={handleCodexInstall}>
          <Icon name="terminal" size={15} />
          Install in Codex
        </a>
        <DownloadCommandRow
          command={downloadCommand}
          copied={copiedDownloadCommand}
          copyIcon={<Icon name={copiedDownloadCommand ? "check" : "copy"} size={13} />}
          helperText="Terminal install command"
          mode={downloadCommandMode}
          onCopy={copyDownloadCommand}
          onModeChange={changeDownloadCommandMode}
        />
        <a className="detailInstallSecondary" href={pet.downloadUrl} download onClick={handleZipDownload}>
          <Icon name="package" size={13} />
          Download sprite kit <code>.codex-pet.zip</code>
        </a>
        <ValidationReportCard report={pet.validationReport} />
      </article>

      <article className="detailStates" aria-label="Animation states">
        <header className="detailSectionHeader">
          <span className="detailSectionLabel">Animation states</span>
          <div className="detailStatesActions">
            <button
              className="btn btnSm"
              type="button"
              disabled={Boolean(gifExportBusy)}
              onClick={exportCurrentStateGif}
            >
              {gifExportBusy === "current" ? <Spinner size={12} /> : <Icon name="download" size={13} />}
              {gifExportBusy === "current" ? "Exporting" : "Current GIF"}
            </button>
            <button
              className="btn btnSm"
              type="button"
              disabled={Boolean(gifExportBusy)}
              onClick={exportAllStateGifs}
            >
              {gifExportBusy === "all" ? <Spinner size={12} /> : <Icon name="package" size={13} />}
              {gifExportBusy === "all" ? "Exporting" : "All GIFs"}
            </button>
            <a className="btn btnSm" href={pet.spritesheetUrl} download>
              <Icon name="sheet" size={13} />
              Sheet
            </a>
          </div>
        </header>
        {gifExportStatus ? (
          <p className="status detailStatesStatus" role="alert">
            {gifExportStatus}
          </p>
        ) : null}
        {canFixSprites ? (
          <div className="detailSpriteFixPanel" role="note">
            <div className="detailSpriteFixCopy">
              <span className="detailSpriteFixLabel">Pet tools</span>
              <strong>Fix left/right run rows.</strong>
              <p>Use this when the pet walks the wrong way, or when one side should be mirrored from the other.</p>
            </div>
            <button className="btn btnPrimary btnSm detailSpriteFixButton" type="button" onClick={() => onFixSprites(pet)}>
              <Icon name="swap" size={13} />
              Open fixer
            </button>
          </div>
        ) : null}
        <div className="detailStatesGrid">
          {petStates.map((state) => (
            <div
              className={`detailStateTile ${state.id === activeState.id ? "active" : ""}`}
              key={state.id}
            >
              <button
                className="detailStateTileMain"
                type="button"
                aria-pressed={state.id === activeState.id}
                onClick={() => setActiveStateId(state.id)}
              >
                <PetSprite
                  pet={pet}
                  row={state.row}
                  frames={state.frames}
                  label={state.label}
                  size="small"
                  transparent
                />
                <span className="detailStateTileLabel">{state.label}</span>
              </button>
              <button
                className="detailStateTileGif"
                type="button"
                disabled={Boolean(gifExportBusy)}
                onClick={() => exportStateGif(state, `state:${state.id}`)}
                aria-label={`Download ${state.label} GIF`}
              >
                {gifExportBusy === `state:${state.id}` ? (
                  <Spinner size={11} />
                ) : (
                  <>
                    <Icon name="download" size={11} />
                    GIF
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </article>

      {(canEditTags || Boolean(deleteStatus)) && (
        <div className="detailAdminBar">
          <div className="detailActions">
            {canEditTags && (
              <button className="btn btnSm" type="button" onClick={() => onEditTags(pet)}>
                <Icon name="tag" size={13} />
                Edit tags
              </button>
            )}
          </div>
          {canDelete && deleteStatus && (
            <p className="status" role="alert">
              {deleteStatus}
            </p>
          )}
        </div>
      )}

      {morePets.length > 0 && (
        <section className="detailMore" aria-labelledby="more-pets-title">
          <div className="sectionHeading">
            <h2 id="more-pets-title">More pets</h2>
          </div>
          <div className="detailMoreGrid">
            {morePets.map((morePet) => (
              <PetCard
                key={morePet.id}
                pet={morePet}
                user={user}
                likeBusyId={likeBusyId}
                deletingPetId={deletingPetId}
                shadowbanBusyOwnerId={shadowbanBusyOwnerId}
                nsfwBusyId={nsfwBusyId}
                contentMode={contentMode}
                hasCollections={hasCollections}
                onLike={onLike}
                onShare={onShare}
                onPlayground={onPlayground}
                onDownload={onDownload}
                onTagClick={onTagClick}
                onEditTags={onEditTags}
                onManageCollections={onManageCollections}
                onToggleNsfw={onToggleNsfw}
                onShadowbanOwner={onShadowbanOwner}
                onDelete={onDelete}
                onSignIn={onSignIn}
              />
            ))}
          </div>
        </section>
      )}

      {cursorPreview && cursorPoint && (
        <div
          className="cursorPetPreview"
          style={
            {
              left: cursorPoint.x,
              top: cursorPoint.y,
              "--cursor-rotation": cursorPreviewReady ? `${cursorRotationDeg}deg` : "0deg"
            } as CSSProperties
          }
          aria-hidden="true"
        >
          {cursorPreviewReady ? (
            <CursorPetPreview pet={pet} stateId={cursorStateId} />
          ) : (
            <div className="cursorPetLoader">
              <Spinner size={14} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
