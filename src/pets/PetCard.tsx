import { trackEvent } from "../domain/analytics";
import { type TagName } from "../domain/config";
import { navigate } from "../domain/routing";
import type { ContentMode, GalleryView, Pet, User } from "../domain/types";
import { Icon } from "../ui/Icon";
import { stopCardPropagation } from "./card/card-events";
import { PetCardActionBar } from "./card/PetCardActionBar";
import { PetCardBody } from "./card/PetCardBody";
import { PetCardPreviewStage } from "./card/PetCardPreviewStage";
import { PetCardQuickActions } from "./card/PetCardQuickActions";
import { usePetCardHover } from "./card/usePetCardHover";

export { AdminPetMenu } from "./card/AdminPetMenu";

export function PetCard({
  pet,
  view = "standard",
  user,
  likeBusyId,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  contentMode,
  hasCollections,
  collectionBadge,
  onLike,
  onShare,
  onPlayground,
  onDownload,
  onTagClick,
  onEditTags,
  onManageCollections,
  onCollect,
  onRemoveFromCollection,
  onQuickComment,
  onPreview,
  previewActive = false,
  onToggleNsfw,
  onShadowbanOwner,
  onDelete,
  onSignIn
}: {
  pet: Pet;
  view?: GalleryView;
  user: User | null;
  likeBusyId: string;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  contentMode: ContentMode;
  hasCollections: boolean;
  collectionBadge?: { slug: string; displayName: string };
  onLike: (pet: Pet) => void;
  onShare: (pet: Pet) => void;
  onPlayground?: (pet: Pet) => void;
  onDownload: (pet: Pet) => void;
  onTagClick: (tag: TagName, sourceTags: string[]) => void;
  onEditTags: (pet: Pet) => void;
  onManageCollections: (pet: Pet) => void;
  onCollect?: (pet: Pet) => void;
  onRemoveFromCollection?: (pet: Pet) => void;
  onQuickComment?: (pet: Pet) => void;
  onPreview?: (pet: Pet) => void;
  previewActive?: boolean;
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner?: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onSignIn: () => void;
}) {
  const compact = view === "compact";
  const {
    animateCardPreview,
    markCardPointerInside,
    markCardPointerOutside,
    handleMagneticPointerMove,
    handleCardPointerLeave,
    markCardFocusInside,
    handleCardBlur
  } = usePetCardHover(compact);
  const openPetPage = () => {
    trackEvent("card_detail_open", { route: "gallery_card", petId: pet.id, user });
    navigate(`/pets/${pet.id}`);
  };

  return (
    <article
      className={`petCard card ${compact ? "compact" : "pocMagneticPlate"}`}
      onMouseEnter={markCardPointerInside}
      onMouseOver={markCardPointerInside}
      onMouseLeave={markCardPointerOutside}
      onPointerEnter={markCardPointerInside}
      onPointerOver={markCardPointerInside}
      onPointerMove={handleMagneticPointerMove}
      onPointerLeave={handleCardPointerLeave}
      onFocus={markCardFocusInside}
      onBlur={handleCardBlur}
    >
      <PetCardQuickActions
        pet={pet}
        user={user}
        previewActive={previewActive}
        onPreview={onPreview}
        onPlayground={onPlayground}
        onQuickComment={onQuickComment}
      />
      {collectionBadge && (
        <a
          className="petCardCollectionPill"
          href={`#/collections/${collectionBadge.slug}`}
          onClick={stopCardPropagation}
          onMouseOver={stopCardPropagation}
          onPointerDown={stopCardPropagation}
        >
          <Icon name="package" size={12} />
          <span>{collectionBadge.displayName}</span>
        </a>
      )}
      <PetCardPreviewStage pet={pet} compact={compact} active={animateCardPreview} onOpen={openPetPage} />
      <PetCardBody pet={pet} compact={compact} onOpen={openPetPage} onTagClick={onTagClick} />
      <PetCardActionBar
        pet={pet}
        compact={compact}
        user={user}
        likeBusyId={likeBusyId}
        deletingPetId={deletingPetId}
        shadowbanBusyOwnerId={shadowbanBusyOwnerId}
        nsfwBusyId={nsfwBusyId}
        onLike={onLike}
        onShare={onShare}
        onDownload={onDownload}
        onEditTags={onEditTags}
        onManageCollections={onManageCollections}
        onCollect={onCollect}
        onRemoveFromCollection={onRemoveFromCollection}
        onToggleNsfw={onToggleNsfw}
        onShadowbanOwner={onShadowbanOwner}
        onDelete={onDelete}
        onSignIn={onSignIn}
      />
    </article>
  );
}
