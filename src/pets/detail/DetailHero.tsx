import { trackEvent } from "../../domain/analytics";
import type { PetAnimationRow, TagName } from "../../domain/config";
import { isNsfwPet } from "../../domain/pets";
import type { Pet, User } from "../../domain/types";
import { Icon } from "../../ui/Icon";
import { AdminPetMenu } from "../PetCard";
import { OwnerLabel, PetStats, PetTags } from "../PetMeta";
import { PetSprite } from "../PetPreview";

export function DetailHero({
  pet,
  user,
  activeState,
  animationRows,
  onSelectState,
  likeBusyId,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  canCursorPreview,
  cursorPreview,
  canEditTags,
  canFixSprites,
  canDelete,
  hasManagementActions,
  onCursorPreviewChange,
  onLike,
  onShare,
  onPlayground,
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
  activeState: PetAnimationRow;
  animationRows: readonly PetAnimationRow[];
  onSelectState: (stateId: string) => void;
  likeBusyId: string;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  canCursorPreview: boolean;
  cursorPreview: boolean;
  canEditTags: boolean;
  canFixSprites: boolean;
  canDelete: boolean;
  hasManagementActions: boolean;
  onCursorPreviewChange: (enabled: boolean) => void;
  onLike: (pet: Pet) => void;
  onShare: (pet: Pet) => void;
  onPlayground?: (pet: Pet) => void;
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
  const specimenId = pet.id;

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

  return (
    <article className="detailHero">
      <header className="detailHeader">
        <p className="detailSpecimen">
          <span className="detailSpecimenItem">id / <strong>{specimenId}</strong></span>
          <span className="detailSpecimenSep" aria-hidden="true">·</span>
          <span className="detailSpecimenItem">by <OwnerLabel pet={pet} className="detailSpecimenOwner" /></span>
          {pet.spriteVersionNumber !== 2 && <span className="petFormatPill v1">V1 · legacy</span>}
          {isNsfwPet(pet) ? <span className="detailNsfwPill">NSFW</span> : null}
        </p>
        <h1 className="detailTitle">{pet.displayName}</h1>
        {pet.description ? <p className="detailLede">{pet.description}</p> : null}
        {pet.tags.length > 0 ? <PetTags tags={pet.tags} onTagClick={onTagClick} /> : null}
      </header>

      <div className="detailShowcase detailExhibit">
        {canCursorPreview ? (
          <button
            className={`detailWalkButton ${cursorPreview ? "active" : ""}`}
            type="button"
            aria-pressed={cursorPreview}
            onClick={() => onCursorPreviewChange(!cursorPreview)}
          >
            <span className="detailWalkButtonGlyph" aria-hidden="true">{cursorPreview ? "✓" : "→"}</span>
            {pet.spriteVersionNumber === 2
              ? cursorPreview ? "Looking with you" : "Try its 16 look directions"
              : cursorPreview ? "Walking with you" : "Take it for a walk"}
          </button>
        ) : null}
        <PetSprite
          pet={pet}
          row={activeState.row}
          frames={activeState.frames}
          label={activeState.label}
          size="large"
          transparent
        />
        <div className="detailStateChips" role="tablist" aria-label="Animation states">
          {animationRows.map((state) => (
            <button
              className={`detailStateChip ${state.id === activeState.id ? "active" : ""}`}
              key={state.id}
              type="button"
              role="tab"
              aria-selected={state.id === activeState.id}
              onClick={() => onSelectState(state.id)}
            >
              {state.label}
            </button>
          ))}
        </div>
      </div>

      {hasManagementActions ? (
        <div className="detailCreatorTools" role="group" aria-label="Pet tools">
          <span className="detailCreatorToolsLabel">Pet tools</span>
          <div className="detailCreatorToolsButtons">
            {canEditTags ? (
              <button className="btn btnSm" type="button" onClick={() => onEditTags(pet)}>
                <Icon name="tag" size={13} />
                Edit details
              </button>
            ) : null}
            {canFixSprites ? (
              <button className="btn btnSm detailFixSpritesAction" type="button" onClick={() => onFixSprites(pet)}>
                <Icon name="sheet" size={13} />
                Edit sprites
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
          {onCollect && (
            <button className="btn btnSm" type="button" onClick={handleCollect}>
              <Icon name="package" size={13} />
              Add to collection
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
