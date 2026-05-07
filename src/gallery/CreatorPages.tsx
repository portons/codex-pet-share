import { type CSSProperties } from "react";
import { type TagName } from "../domain/config";
import { formatMetric } from "../domain/format";
import { navigate } from "../domain/routing";
import type { ContentMode, Creator, CreatorLeaderboardItem, GalleryMeta, Pet, User } from "../domain/types";
import { PetCard } from "../pets/PetCard";
import { CyclingPetPreview } from "../pets/PetPreview";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { ResultBar } from "../ui/ResultBar";
import { GallerySkeleton, UploadsSkeleton } from "../ui/Skeletons";
import { SignInGate } from "../ui/SignInGate";
import { PaginationControls } from "./PaginationControls";

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
    <section className="surface">
      <header className="sectionHeader">
        <div>
          <p className="metaText">Creator</p>
          <h1>
            {creator?.displayName || "Creator"}
            {creator?.shadowbanned && (
              <span className="shadowbanIcon" title="Shadowbanned">
                <Icon name="ban" size={18} />
              </span>
            )}
          </h1>
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

export function CreatorsLeaderboardPage({
  creators,
  total,
  loading
}: {
  creators: CreatorLeaderboardItem[];
  total: number;
  loading: boolean;
}) {
  return (
    <section className="surface">
      <header className="sectionHeader">
        <div>
          <p className="metaText">Creators</p>
          <h1>Leaderboard</h1>
          <p className="sectionSubhead">{formatMetric(total)} {total === 1 ? "creator" : "creators"}</p>
        </div>
      </header>
      {loading ? (
        <UploadsSkeleton />
      ) : creators.length ? (
        <table className="uploadsTable creatorsTable card">
          <thead className="uploadsHead">
            <tr>
              <th scope="col">Creator</th>
              <th scope="col">Uploads</th>
              <th scope="col">Likes</th>
              <th scope="col">Views</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((creator, index) => (
              <tr className="uploadsRow creatorRow" key={creator.id}>
                <td>
                  <div className="creatorLeaderboardCell">
                    <span className={`leaderRank rank${index + 1}`}>{index + 1}</span>
                    <div className="creatorLeaderboardStack">
                      <div className="leaderPets">
                        {creator.topPets.map((pet) => (
                          <button
                            className="leaderPetPreview"
                            key={pet.id}
                            type="button"
                            title={pet.displayName}
                            onClick={() => navigate(`/pets/${pet.id}`)}
                          >
                            <CyclingPetPreview pet={pet} size="thumb" transparent />
                          </button>
                        ))}
                      </div>
                      <button className="ownerLink" type="button" onClick={() => navigate(`/users/${creator.handle || creator.id}`)}>
                        {creator.displayName}
                      </button>
                    </div>
                  </div>
                </td>
                <td>
                  <p className="monoText leaderboardMetric">
                    <span className="leaderMetricLabel">Uploads</span>
                    {formatMetric(creator.petCount)}
                  </p>
                </td>
                <td>
                  <p className="monoText leaderboardMetric">
                    <span className="leaderMetricLabel">Likes</span>
                    {formatMetric(creator.likeCount)}
                  </p>
                </td>
                <td>
                  <p className="monoText leaderboardMetric">
                    <span className="leaderMetricLabel">Views</span>
                    {formatMetric(creator.viewCount)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState text="No creators yet." />
      )}
    </section>
  );
}

// Thin wrapper that fires the one-shot presence-count hook for a
// single collection (the detail-page route). Re-runs only when the
