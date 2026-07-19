import { type CSSProperties } from "react";
import { type TagName } from "../../domain/config";
import type { ContentMode, Pet, User } from "../../domain/types";
import { PetCard } from "../../pets/PetCard";
import { EmptyState } from "../../ui/EmptyState";
import { GallerySkeleton } from "../../ui/Skeletons";
import { SignInGate } from "../../ui/SignInGate";

export function FavoritesPage({
  user,
  pets,
  loading,
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
  onCollect,
  onToggleNsfw,
  onShadowbanOwner,
  onDelete,
  onSignIn
}: {
  user: User | null;
  pets: Pet[];
  loading: boolean;
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
  onCollect?: (pet: Pet) => void;
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onSignIn: () => void;
}) {
  if (!user) {
    return (
      <section className="surface">
        <SignInGate label="Sign in to view favorites." onSignIn={onSignIn} />
      </section>
    );
  }

  return (
    <section className="surface">
      <header className="sectionHeader">
        <div>
          <p className="metaText">{user.displayName}</p>
          <h1>Favorites</h1>
        </div>
      </header>
      {loading ? (
        <GallerySkeleton />
      ) : pets.length ? (
        <div className="galleryGrid">
          {pets.map((pet, index) => (
            <div
              className="revealItem"
              key={pet.id}
              style={{ "--delay": `${index * 60}ms` } as CSSProperties}
            >
              <PetCard
                pet={pet}
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
                onCollect={onCollect}
                onToggleNsfw={onToggleNsfw}
                onShadowbanOwner={onShadowbanOwner}
                onDelete={onDelete}
                onSignIn={onSignIn}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text="No favorites yet." />
      )}
    </section>
  );
}
