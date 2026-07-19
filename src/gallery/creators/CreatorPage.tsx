import { type CSSProperties } from "react";
import { type TagName } from "../../domain/config";
import type { ContentMode, Creator, GalleryMeta, Pet, User } from "../../domain/types";
import { PetCard } from "../../pets/PetCard";
import { EmptyState } from "../../ui/EmptyState";
import { Icon } from "../../ui/Icon";
import { ResultBar } from "../../ui/ResultBar";
import { GallerySkeleton } from "../../ui/Skeletons";
import { UserAvatar } from "../../ui/UserAvatar";
import { PaginationControls } from "../PaginationControls";

export function CreatorPage({
  creator,
  pets,
  meta,
  loading,
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
  onShareCreator,
  onDownload,
  onTagClick,
  onEditTags,
  onManageCollections,
  onCollect,
  onToggleNsfw,
  onShadowbanOwner,
  onDelete,
  onSignIn,
  onPage
}: {
  creator: Creator | null;
  pets: Pet[];
  meta: GalleryMeta;
  loading: boolean;
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
  onShareCreator: () => void;
  onDownload: (pet: Pet) => void;
  onTagClick: (tag: TagName, sourceTags: string[]) => void;
  onEditTags: (pet: Pet) => void;
  onManageCollections: (pet: Pet) => void;
  onCollect?: (pet: Pet) => void;
  onToggleNsfw: (pet: Pet) => void;
  onShadowbanOwner: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
  onSignIn: () => void;
  onPage: (page: number) => void;
}) {
  return (
    <section className="surface creatorDetailSurface">
      <header className="sectionHeader">
        <div>
          <p className="metaText">Creator</p>
          <div className="creatorDetailTitle">
            {creator ? <UserAvatar name={creator.displayName} avatarUrl={creator.avatarUrl} size="lg" /> : null}
            <h1>
              {creator?.displayName || "Creator"}
              {creator?.shadowbanned && (
                <span className="shadowbanIcon" title="Shadowbanned">
                  <Icon name="ban" size={18} />
                </span>
              )}
            </h1>
          </div>
        </div>
        {creator && (
          <button className="btn btnSm" type="button" onClick={onShareCreator} aria-label={`Share ${creator.displayName}`}>
            <Icon name="share" size={13} />
            Share
          </button>
        )}
      </header>
      <ResultBar meta={meta} loading={loading} />
      {loading && !pets.length ? (
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
        <EmptyState text="No uploads found." />
      )}
      <PaginationControls meta={meta} loading={loading} onPage={onPage} />
    </section>
  );
}
