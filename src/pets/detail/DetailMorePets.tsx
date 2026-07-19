import type { TagName } from "../../domain/config";
import type { ContentMode, Pet, User } from "../../domain/types";
import { PetCard } from "../PetCard";

export function DetailMorePets({
  morePets,
  user,
  likeBusyId,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  contentMode,
  hasCollections,
  onLike,
  onShare,
  onPlayground,
  onDownload,
  onTagClick,
  onEditTags,
  onManageCollections,
  onToggleNsfw,
  onShadowbanOwner,
  onDelete,
  onSignIn
}: {
  morePets: Array<Pet>;
  user: User | null;
  likeBusyId: string;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  contentMode: ContentMode;
  hasCollections: boolean;
  onLike: (pet: Pet) => void;
  onShare: (pet: Pet) => void;
  onPlayground?: (pet: Pet) => void;
  onDownload: (pet: Pet) => void;
  onTagClick: (tag: TagName, sourceTags: string[]) => void;
  onEditTags: (pet: Pet) => void;
  onManageCollections: (pet: Pet) => void;
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onSignIn: () => void;
}) {
  if (morePets.length === 0) {
    return null;
  }

  return (
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
  );
}
