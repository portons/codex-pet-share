import { formatMetric } from "../../domain/format";
import type { Pet, User } from "../../domain/types";
import { Icon } from "../../ui/Icon";
import { AdminPetMenu } from "./AdminPetMenu";
import { trackCardAction } from "./card-events";

export function PetCardActionBar({
  pet,
  compact,
  user,
  likeBusyId,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  onLike,
  onShare,
  onDownload,
  onEditTags,
  onManageCollections,
  onCollect,
  onRemoveFromCollection,
  onToggleNsfw,
  onShadowbanOwner,
  onDelete,
  onSignIn
}: {
  pet: Pet;
  compact: boolean;
  user: User | null;
  likeBusyId: string;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  onLike: (pet: Pet) => void;
  onShare: (pet: Pet) => void;
  onDownload: (pet: Pet) => void;
  onEditTags: (pet: Pet) => void;
  onManageCollections: (pet: Pet) => void;
  onCollect?: (pet: Pet) => void;
  onRemoveFromCollection?: (pet: Pet) => void;
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner?: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onSignIn: () => void;
}) {
  const likeLabel = pet.likedByMe ? "Liked" : "Like";
  const canDeleteOwnPet = Boolean(!user?.isAdmin && user?.id && user.id === pet.ownerId);
  const canEditOwnPet = canDeleteOwnPet;

  return (
    <div className="petCardActions">
      <button
        className="btn btnSm"
        type="button"
        aria-label="Download"
        title="Download"
        onClick={() => {
          trackCardAction(pet, user, "card_download_click");
          onDownload(pet);
        }}
      >
        <Icon name="download" size={13} />
        {!compact && "Download"}
      </button>
      <button
        className="btn btnSm"
        type="button"
        aria-label="Share"
        title="Share"
        onClick={() => {
          trackCardAction(pet, user, "card_share_click");
          onShare(pet);
        }}
      >
        <Icon name="share" size={13} />
        {!compact && "Share"}
      </button>
      {user && onCollect && (
        <button
          className="btn btnSm"
          type="button"
          aria-label="Add to collection"
          title="Add to collection"
          onClick={() => {
            trackCardAction(pet, user, "card_collect_click");
            onCollect(pet);
          }}
        >
          <Icon name="package" size={13} />
          {!compact && "Add to collection"}
        </button>
      )}
      {onRemoveFromCollection && (
        <button
          className="btn btnSm btnDanger"
          type="button"
          aria-label="Remove from collection"
          title="Remove from collection"
          onClick={() => onRemoveFromCollection(pet)}
        >
          <Icon name="trash" size={13} />
          {!compact && "Remove"}
        </button>
      )}
      {user?.isAdmin && (
        <AdminPetMenu
          pet={pet}
          compact={compact}
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
      {canEditOwnPet && (
        <button
          className="btn btnSm"
          type="button"
          aria-label="Edit details"
          title="Edit details"
          onClick={() => onEditTags(pet)}
        >
          <Icon name="tag" size={13} />
          {!compact && "Edit details"}
        </button>
      )}
      {canDeleteOwnPet && (
        <button
          className="btn btnSm btnDanger"
          type="button"
          disabled={Boolean(deletingPetId)}
          aria-label="Delete"
          title="Delete"
          onClick={() => onDelete(pet)}
        >
          <Icon name="trash" size={13} />
          {!compact && (deletingPetId === pet.id ? "Deleting" : "Delete")}
        </button>
      )}
      <button
        className={`btn btnSm likeButton ${pet.likedByMe ? "active" : ""}`}
        type="button"
        disabled={likeBusyId === pet.id}
        aria-label={pet.likedByMe ? "Unlike" : "Like"}
        title={pet.likedByMe ? "Unlike" : "Like"}
        onClick={() => {
          trackCardAction(pet, user, "card_like_click", pet.likedByMe ? "unlike" : "like");
          if (user) {
            onLike(pet);
          } else {
            onSignIn();
          }
        }}
      >
        <Icon name="heart" size={13} />
        {compact ? formatMetric(pet.likeCount) : likeLabel}
      </button>
    </div>
  );
}
