import { type CSSProperties, useEffect, useState, type FormEvent } from "react";
import { type TagName } from "../domain/config";
import { formatMetric } from "../domain/format";
import { navigate } from "../domain/routing";
import type {
  ContentMode,
  Creator,
  CreatorLeaderboardItem,
  CreatorLeaderboardSort,
  GalleryMeta,
  Pet,
  User
} from "../domain/types";
import { PetCard } from "../pets/PetCard";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { ResultBar } from "../ui/ResultBar";
import { GallerySkeleton, UploadsSkeleton } from "../ui/Skeletons";
import { SignInGate } from "../ui/SignInGate";
import { UserAvatar } from "../ui/UserAvatar";
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
  meta,
  mode,
  query,
  loading,
  onMode,
  onQuery,
  onPage
}: {
  creators: CreatorLeaderboardItem[];
  meta: GalleryMeta;
  mode: CreatorLeaderboardSort;
  query: string;
  loading: boolean;
  onMode: (mode: CreatorLeaderboardSort) => void;
  onQuery: (query: string) => void;
  onPage: (page: number) => void;
}) {
  const [draftQuery, setDraftQuery] = useState(query);
  const activeMode = leaderboardModesById[mode];
  const rankedPageCreators = creators.map((creator, index) => ({
    creator,
    rank: creatorAbsoluteRank(meta, index)
  }));
  const featuredCreators = rankedPageCreators.filter((item) => item.rank <= 3);
  const rankedCreators = rankedPageCreators.filter((item) => item.rank > 3);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onQuery(draftQuery);
  }

  function clearQuery() {
    setDraftQuery("");
    onQuery("");
  }

  return (
    <section className="surface creatorLeaderboardSurface">
      <header className="sectionHeader creatorLeaderboardHeader">
        <div>
          <p className="metaText">Creators</p>
          <h1>Leaderboard</h1>
          <p className="sectionSubhead">
            {formatMetric(meta.total)} {meta.total === 1 ? "creator" : "creators"} · sorted by {activeMode.label.toLowerCase()}
            {meta.totalPages > 1 ? ` · page ${meta.page} of ${meta.totalPages}` : ""}
          </p>
        </div>
        <div className="creatorLeaderboardActions">
          <form className="creatorSearchForm" onSubmit={submitQuery}>
            <label className="searchShell creatorSearchShell">
              <Icon name="search" size={15} />
              <input
                className="input inputLg searchInput"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Search creators"
                aria-label="Search creators"
              />
            </label>
            {query ? (
              <button className="btn" type="button" disabled={loading} onClick={clearQuery}>
                Clear
              </button>
            ) : null}
            <button className="btn btnPrimary" type="submit" disabled={loading}>
              Find
            </button>
          </form>
          <div className="creatorLeaderboardToolbar" aria-label="Leaderboard sort">
            {leaderboardModes.map((item) => (
              <button
                className={item.id === mode ? "active" : ""}
                key={item.id}
                type="button"
                aria-pressed={item.id === mode}
                onClick={() => onMode(item.id)}
              >
                <Icon name={item.icon} size={13} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      {loading ? (
        <UploadsSkeleton />
      ) : creators.length ? (
        <div className="creatorLeaderboardBoard">
          <div className="creatorTopPagination">
            <PaginationControls meta={meta} loading={loading} onPage={onPage} />
          </div>
          {featuredCreators.length ? (
            <div className="creatorTopThree" aria-label="Featured creators">
              {featuredCreators.map(({ creator, rank }) => (
              <CreatorFeatureCard
                creator={creator}
                key={creator.id}
                mode={mode}
                rank={rank}
              />
              ))}
            </div>
          ) : null}

          {rankedCreators.length ? (
            <div className="creatorRankList" aria-label="Creator rankings">
              {rankedCreators.map(({ creator, rank }) => (
                <CreatorRankRow creator={creator} key={creator.id} mode={mode} rank={rank} />
              ))}
            </div>
          ) : null}
          <PaginationControls meta={meta} loading={loading} onPage={onPage} />
        </div>
      ) : (
        <EmptyState text={query ? "No creators match that search." : "No creators yet."} />
      )}
    </section>
  );
}

type LeaderboardMode = CreatorLeaderboardSort;
type LeaderboardModeConfig = { id: LeaderboardMode; label: string; icon: "heart" | "eye" | "upload" };

const leaderboardModesById = {
  likes: { id: "likes", label: "Likes", icon: "heart" },
  views: { id: "views", label: "Views", icon: "eye" },
  uploads: { id: "uploads", label: "Uploads", icon: "upload" }
} satisfies Record<LeaderboardMode, LeaderboardModeConfig>;

const leaderboardModes = Object.values(leaderboardModesById);

function creatorAbsoluteRank(meta: GalleryMeta, index: number) {
  return (meta.page - 1) * meta.pageSize + index + 1;
}

function CreatorFeatureCard({
  creator,
  mode,
  rank
}: {
  creator: CreatorLeaderboardItem;
  mode: LeaderboardMode;
  rank: number;
}) {
  return (
    <article className="creatorFeatureCard">
      <div className="creatorFeatureCopy">
        <p className="creatorSpotlightKicker">Rank {rank}</p>
        <div className="creatorFeatureIdentity">
          <UserAvatar name={creator.displayName} avatarUrl={creator.avatarUrl} size="lg" />
          <button
            className="ownerLink creatorFeatureName"
            type="button"
            onClick={() => navigate(`/users/${creator.handle || creator.id}`)}
          >
            {creator.displayName}
          </button>
        </div>
      </div>
      <CreatorPetMosaic creator={creator} variant="feature" />
      <div className="creatorFeatureMetrics" aria-label={`${creator.displayName} stats`}>
        <CreatorMetric active={mode === "likes"} icon="heart" label="Likes" value={creator.likeCount} />
        <CreatorMetric active={mode === "views"} icon="eye" label="Views" value={creator.viewCount} />
        <CreatorMetric active={mode === "uploads"} icon="upload" label="Uploads" value={creator.petCount} />
      </div>
    </article>
  );
}

function CreatorRankRow({
  creator,
  mode,
  rank
}: {
  creator: CreatorLeaderboardItem;
  mode: LeaderboardMode;
  rank: number;
}) {
  return (
    <article
      className="creatorRankRow"
      style={{ "--delay": `${Math.min(rank - 2, 8) * 48}ms` } as CSSProperties}
    >
      <span className={`leaderRank ${rank <= 3 ? `rank${rank}` : ""}`}>{rank}</span>
      <div className="creatorRankIdentity">
        <div className="creatorRankNameWrap">
          <UserAvatar name={creator.displayName} avatarUrl={creator.avatarUrl} size="md" />
          <button className="ownerLink creatorRankName" type="button" onClick={() => navigate(`/users/${creator.handle || creator.id}`)}>
            {creator.displayName}
          </button>
        </div>
        <CreatorPetMosaic creator={creator} variant="row" />
      </div>
      <div className="creatorRankMetrics" aria-label={`${creator.displayName} stats`}>
        <CreatorMetric active={mode === "likes"} icon="heart" label="Likes" value={creator.likeCount} />
        <CreatorMetric active={mode === "views"} icon="eye" label="Views" value={creator.viewCount} />
        <CreatorMetric active={mode === "uploads"} icon="upload" label="Uploads" value={creator.petCount} />
      </div>
    </article>
  );
}

function CreatorPetMosaic({
  creator,
  variant
}: {
  creator: CreatorLeaderboardItem;
  variant: "feature" | "row";
}) {
  const pets = creator.topPets.slice(0, 3);
  if (!pets.length) return null;

  return (
    <div
      className={`${variant === "feature" ? "creatorFeaturePets" : "creatorRankPets"} petCount${pets.length}`}
      aria-label={`${creator.displayName} top pets`}
    >
      {pets.map((pet, index) => (
        <button
          className={variant === "feature" ? "creatorFeaturePet" : "creatorRankPet"}
          key={pet.id}
          type="button"
          title={pet.displayName}
          onClick={() => navigate(`/pets/${pet.id}`)}
        >
          <img
            alt=""
            aria-hidden="true"
            decoding="async"
            draggable={false}
            height={208}
            loading={variant === "feature" && index === 0 ? "eager" : "lazy"}
            src={pet.posterUrl}
            width={192}
          />
          <span>{pet.displayName}</span>
        </button>
      ))}
    </div>
  );
}

function CreatorMetric({
  active,
  icon,
  label,
  value
}: {
  active?: boolean;
  icon: "heart" | "eye" | "upload";
  label: string;
  value: number;
}) {
  const formattedValue = formatMetric(value);
  return (
    <span className={`creatorMetric ${active ? "active" : ""}`} aria-label={`${label}: ${formattedValue}`}>
      <Icon name={icon} size={13} />
      <span>{label}</span>
      <strong>{formattedValue}</strong>
    </span>
  );
}

// Thin wrapper that fires the one-shot presence-count hook for a
// single collection (the detail-page route). Re-runs only when the
