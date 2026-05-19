import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { type TagName } from "../domain/config";
import { formatDate, formatMetric } from "../domain/format";
import type { AuthSession, CollectionSummary, ContentMode, GalleryMeta, GalleryRecentComment, GallerySort, GalleryView, Pet, PetKind, User } from "../domain/types";
import { useCollectionPresenceCounts } from "../realtime/useCollectionPresenceCounts";
import { CursorPetPreview, useCursorPreviewAssets, useCursorPreviewMotion, useCursorPreviewSupport } from "../pets/CursorPreview";
import { PetCard } from "../pets/PetCard";
import { CyclingPetPreview } from "../pets/PetPreview";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { ResultBar } from "../ui/ResultBar";
import { GallerySkeleton } from "../ui/Skeletons";
import { Spinner } from "../ui/Spinner";
import { GallerySearch } from "./GalleryControls";
import { PaginationControls } from "./PaginationControls";

// Mirror of CollectionsPageWithPresence: keeps the one-shot presence
// hook scoped to the gallery route only, so we don't open lurker
// channels on /favorites, /mine, /upload, etc. when the user is not
// looking at the gallery home.
export function GalleryWithPresence({
  collections,
  session,
  ...rest
}: Omit<Parameters<typeof Gallery>[0], "presenceCounts"> & { session: AuthSession | null }) {
  const slugs = collections.map((c) => c.slug);
  const presenceCounts = useCollectionPresenceCounts(slugs, session);
  return <Gallery {...rest} collections={collections} presenceCounts={presenceCounts} />;
}

// Editorial strip on the gallery home that surfaces only the
// collections currently hosting at least one connected user. Renders
// nothing when no rooms are live — the home page should never show an
// empty live-rooms placeholder.
function LiveCollectionsStrip({
  collections,
  presenceCounts,
  signedIn,
  onSignIn
}: {
  collections: Array<CollectionSummary>;
  // One-shot snapshot of "people in the room" per slug at gallery
  // mount time. Empty when signed out (private:true topics need an
  // authed websocket). Not live — refreshes only on remount.
  presenceCounts: Map<string, number>;
  signedIn: boolean;
  onSignIn: () => void;
}) {
  // Filter to collections with at least one live user, then sort by
  // descending count so the busiest room sits on the left where the
  // eye lands first. Stable secondary sort by displayName so equal
  // counts don't shuffle between renders.
  const liveCollections = collections
    .map((c) => ({ collection: c, count: presenceCounts.get(c.slug) ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.collection.displayName.localeCompare(b.collection.displayName);
    });

  if (liveCollections.length === 0) return null;

  // Single compact line — the gallery is the main act, this is a
  // peripheral signal. Total head count keeps the wording terse
  // regardless of room count: "1 person live", "7 people live".
  const totalLive = liveCollections.reduce((sum, e) => sum + e.count, 0);

  return (
    <aside className="liveCollectionsRail" aria-label="Collections with people online right now">
      <p className="liveCollectionsRailCaption metaText">
        <span className="liveCollectionsRailDot" aria-hidden="true" />
        <span>
          {totalLive} {totalLive === 1 ? "person" : "people"} live
          {liveCollections.length > 1 ? ` · ${liveCollections.length} rooms` : ""}
        </span>
      </p>
      <ol className="liveCollectionsRailList">
        {liveCollections.map((entry, index) => {
          const { collection, count } = entry;
          const href = `#/collections/${collection.slug}/play`;
          const ariaLabel = `Join ${collection.displayName} · ${count} ${count === 1 ? "person" : "people"} live`;
          const rowStyle = { "--delay": `${index * 70}ms` } as CSSProperties;
          const inner = (
            <>
              <span className="liveCollectionsRailAvatars" aria-hidden="true">
                {collection.topPets.slice(0, 2).map((pet, petIndex) => (
                  <span
                    key={pet.id}
                    className="liveCollectionsRailAvatarSlot"
                    style={{ "--slot-index": petIndex } as CSSProperties}
                  >
                    <CyclingPetPreview pet={pet} size="thumb" transparent />
                  </span>
                ))}
              </span>
              <span className="liveCollectionsRailMeta">
                <span className="liveCollectionsRailName">{collection.displayName}</span>
                <span className="liveCollectionsRailSub">
                  <span className="liveCollectionsRailCount">{count}</span>
                  <span className="liveCollectionsRailWord">{count === 1 ? "person" : "people"}</span>
                </span>
              </span>
              <span className="liveCollectionsRailArrow" aria-hidden="true">→</span>
            </>
          );
          return (
            <li key={collection.slug}>
              {signedIn ? (
                <a
                  className="liveCollectionsRailRow revealItem"
                  style={rowStyle}
                  href={href}
                  aria-label={ariaLabel}
                  title={ariaLabel}
                >
                  {inner}
                </a>
              ) : (
                <button
                  type="button"
                  className="liveCollectionsRailRow revealItem"
                  style={rowStyle}
                  onClick={onSignIn}
                  aria-label={ariaLabel}
                  title={ariaLabel}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function DiscussionContextRail({
  comments,
  loading
}: {
  comments: GalleryRecentComment[];
  loading: boolean;
}) {
  if (loading && comments.length === 0) {
    return null;
  }

  return (
    <aside className="discussionRail" aria-label="Recent comments">
      <div className="discussionRailIntro">
        <span className="discussionRailKicker">
          <Icon name="comment" size={13} />
          Recent comments
        </span>
      </div>
      <RecentCommentList comments={comments} />
    </aside>
  );
}

function RecentCommentList({ comments }: { comments: GalleryRecentComment[] }) {
  if (!comments.length) {
    return <p className="discussionEmpty">No recent comments match these filters.</p>;
  }

  return (
    <ol className="recentCommentList">
      {comments.map((comment, index) => {
        const commentHref = `#/pets/${comment.petId}?comment=${encodeURIComponent(comment.id)}`;
        const petHref = `#/pets/${comment.petId}`;
        const authorHref = comment.authorId ? `#/users/${comment.authorHandle || comment.authorId}` : "";
        return (
          <li
            key={comment.id}
            className="recentCommentItem"
            style={{ "--discussion-index": index } as CSSProperties}
          >
            <div className="recentCommentBody">
              <a className="recentCommentPet" href={petHref}>{comment.petDisplayName}</a>
              <a className="recentCommentText" href={commentHref}>{comment.body}</a>
            </div>
            <span className="recentCommentMeta">
              {authorHref ? (
                <a href={authorHref}>{comment.authorName}</a>
              ) : (
                <span>{comment.authorName}</span>
              )}
              <span>{formatDate(comment.createdAt)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function DiscussionLeaderboard({
  pets,
  meta,
  loading,
  onPage
}: {
  pets: Pet[];
  meta: GalleryMeta;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  const rankedPets = pets.map((pet, index) => ({
    pet,
    rank: (meta.page - 1) * meta.pageSize + index + 1
  }));
  const featuredPets = rankedPets.filter((item) => item.rank <= 3);
  const remainingPets = rankedPets.filter((item) => item.rank > 3);

  if (loading) {
    return <GallerySkeleton view="compact" />;
  }

  if (!pets.length) {
    return <EmptyState text="No discussed pets yet." />;
  }

  return (
    <section className="discussionLeaderboard" aria-label="Most discussed pets">
      <header className="discussionLeaderboardHeader">
        <div>
          <p className="metaText">Pets</p>
          <h2>Most discussed</h2>
          <p className="sectionSubhead">
            {formatMetric(meta.total)} {meta.total === 1 ? "pet" : "pets"} ranked by message count
            {meta.totalPages > 1 ? ` · page ${meta.page} of ${meta.totalPages}` : ""}
          </p>
        </div>
      </header>
      <div className="discussionLeaderboardBoard">
        {meta.totalPages > 1 ? (
          <div className="creatorTopPagination">
            <PaginationControls meta={meta} loading={loading} onPage={onPage} />
          </div>
        ) : null}
        {featuredPets.length ? (
          <div className="discussionTopThree" aria-label="Top discussed pets">
            {featuredPets.map(({ pet, rank }) => (
              <DiscussionFeatureCard key={pet.id} pet={pet} rank={rank} />
            ))}
          </div>
        ) : null}
        {remainingPets.length ? (
          <div className="discussionRankList" aria-label="Pet discussion rankings">
            {remainingPets.map(({ pet, rank }) => (
              <DiscussionRankRow key={pet.id} pet={pet} rank={rank} />
            ))}
          </div>
        ) : null}
        <PaginationControls meta={meta} loading={loading} onPage={onPage} />
      </div>
    </section>
  );
}

function DiscussionFeatureCard({ pet, rank }: { pet: Pet; rank: number }) {
  return (
    <article className="discussionFeatureCard">
      <div className="discussionFeatureCopy">
        <p className="creatorSpotlightKicker">Rank {rank}</p>
        <a className="discussionFeatureName" href={`#/pets/${pet.id}`}>{pet.displayName}</a>
        <a className="discussionOwnerLink" href={pet.ownerId ? `#/users/${pet.ownerHandle || pet.ownerId}` : `#/pets/${pet.id}`}>
          by {pet.ownerName}
        </a>
      </div>
      <a className="discussionFeaturePet" href={`#/pets/${pet.id}`} aria-label={pet.displayName}>
        <img
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable={false}
          height={208}
          loading="lazy"
          src={pet.posterUrl}
          width={192}
        />
      </a>
      <DiscussionMetrics pet={pet} />
    </article>
  );
}

function DiscussionRankRow({ pet, rank }: { pet: Pet; rank: number }) {
  return (
    <article
      className="discussionRankRow"
      style={{ "--delay": `${Math.min(rank - 2, 8) * 48}ms` } as CSSProperties}
    >
      <span className={`leaderRank ${rank <= 3 ? `rank${rank}` : ""}`}>{rank}</span>
      <div className="discussionRankIdentity">
        <a className="discussionRankName" href={`#/pets/${pet.id}`}>{pet.displayName}</a>
        <a className="discussionOwnerLink" href={pet.ownerId ? `#/users/${pet.ownerHandle || pet.ownerId}` : `#/pets/${pet.id}`}>
          by {pet.ownerName}
        </a>
      </div>
      <DiscussionMetrics pet={pet} />
    </article>
  );
}

function DiscussionMetrics({ pet }: { pet: Pet }) {
  return (
    <div className="discussionMetrics" aria-label={`${pet.displayName} discussion stats`}>
      <span className="creatorMetric active" aria-label={`Messages: ${formatMetric(pet.commentCount)}`}>
        <Icon name="comment" size={13} />
        <span>Messages</span>
        <strong>{formatMetric(pet.commentCount)}</strong>
      </span>
      <span className="creatorMetric" aria-label={`Likes: ${formatMetric(pet.likeCount)}`}>
        <Icon name="heart" size={13} />
        <span>Likes</span>
        <strong>{formatMetric(pet.likeCount)}</strong>
      </span>
      <span className="creatorMetric" aria-label={`Views: ${formatMetric(pet.viewCount)}`}>
        <Icon name="eye" size={13} />
        <span>Views</span>
        <strong>{formatMetric(pet.viewCount)}</strong>
      </span>
    </div>
  );
}

function Gallery({
  pets,
  recentComments,
  meta,
  loading,
  query,
  activeTags,
  activeSort,
  activeView,
  activeKind,
  contentMode,
  deletingPetId,
  shadowbanBusyOwnerId,
  nsfwBusyId,
  hasCollections,
  collections,
  presenceCounts,
  onQuery,
  onTagToggle,
  onTagsClear,
  onSort,
  onView,
  onKind,
  onPage,
  onRandomize,
  freshPetCount,
  onFreshPets,
  onSearch,
  user,
  likeBusyId,
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
  pets: Pet[];
  recentComments: GalleryRecentComment[];
  meta: GalleryMeta;
  loading: boolean;
  query: string;
  activeTags: string[];
  activeSort: GallerySort;
  activeView: GalleryView;
  activeKind: PetKind;
  contentMode: ContentMode;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  hasCollections: boolean;
  collections: Array<CollectionSummary>;
  presenceCounts: Map<string, number>;
  onQuery: (value: string) => void;
  onTagToggle: (value: TagName) => void;
  onTagsClear: () => void;
  onSort: (value: GallerySort) => void;
  onView: (value: GalleryView) => void;
  onKind: (value: PetKind) => void;
  onPage: (page: number) => void;
  onRandomize: () => void;
  freshPetCount: number;
  onFreshPets: () => void;
  onSearch: (event: FormEvent) => void;
  user: User | null;
  likeBusyId: string;
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
  const [previewPet, setPreviewPet] = useState<Pet | null>(null);
  const canCursorPreview = useCursorPreviewSupport();
  const cursorPreviewEnabled = Boolean(previewPet && canCursorPreview);
  const cursorPreviewReady = useCursorPreviewAssets(previewPet, cursorPreviewEnabled);
  const { cursorPoint, cursorStateId, cursorRotationDeg } = useCursorPreviewMotion(cursorPreviewEnabled);
  const publicCollectionByPetId = useMemo(() => {
    const byPetId = new Map<string, Pick<CollectionSummary, "slug" | "displayName">>();
    for (const collection of collections) {
      if (collection.ownerId) continue;
      for (const petId of collection.petIds ?? []) {
        if (!byPetId.has(petId)) {
          byPetId.set(petId, { slug: collection.slug, displayName: collection.displayName });
        }
      }
    }
    return byPetId;
  }, [collections]);

  useEffect(() => {
    if (!canCursorPreview) {
      setPreviewPet(null);
    }
  }, [canCursorPreview]);

  return (
    <section className="surface">
      <LiveCollectionsStrip
        collections={collections}
        presenceCounts={presenceCounts}
        signedIn={Boolean(user)}
        onSignIn={onSignIn}
      />
      <GallerySearch
        query={query}
        activeTags={activeTags}
        activeSort={activeSort}
        activeView={activeView}
        activeKind={activeKind}
        contentMode={contentMode}
        loading={loading}
        onQuery={onQuery}
        onTagToggle={onTagToggle}
        onTagsClear={onTagsClear}
        onSort={onSort}
        onView={onView}
        onKind={onKind}
        onSubmit={onSearch}
      />
      <div className={`galleryStatusRow ${freshPetCount > 0 ? "hasFresh" : ""}`}>
        <ResultBar meta={meta} loading={loading} />
        {freshPetCount > 0 && (
          <div className="freshPetsNotice" role="status">
            <div>
              <p className="freshPetsEyebrow">
                <span className="freshPetsDot" aria-hidden="true" />
                New upload{freshPetCount === 1 ? "" : "s"}
              </p>
              <p className="freshPetsCopy">
                {freshPetCount} new pet{freshPetCount === 1 ? "" : "s"} ready.
              </p>
            </div>
            <button className="btn btnPrimary" type="button" disabled={loading} onClick={onFreshPets}>
              <Icon name="sparkle" size={13} />
              Show
            </button>
          </div>
        )}
      </div>
      {activeSort !== "random" && activeSort !== "discussed" && meta.totalPages > 1 ? (
        <div className="galleryTopPagination">
          <PaginationControls meta={meta} loading={loading} onPage={onPage} />
        </div>
      ) : null}
      {activeSort === "discussed" ? (
        <>
          <DiscussionContextRail comments={recentComments} loading={loading} />
          <DiscussionLeaderboard pets={pets} meta={meta} loading={loading} onPage={onPage} />
        </>
      ) : loading ? (
        <GallerySkeleton view={activeView} />
      ) : pets.length ? (
        <div className="galleryResultsShell">
          <div className={`galleryGrid ${activeView}`}>
            {pets.map((pet, index) => (
              <div
                className="revealItem"
                key={pet.id}
                style={{ "--delay": `${index * 60}ms` } as CSSProperties}
              >
                <PetCard
                  pet={pet}
                  view={activeView}
                  user={user}
                  likeBusyId={likeBusyId}
                  deletingPetId={deletingPetId}
                  shadowbanBusyOwnerId={shadowbanBusyOwnerId}
                  nsfwBusyId={nsfwBusyId}
                  contentMode={contentMode}
                  hasCollections={hasCollections}
                  collectionBadge={publicCollectionByPetId.get(pet.id)}
                  onLike={onLike}
                  onShare={onShare}
                  onPlayground={onPlayground}
                  onDownload={onDownload}
                  onTagClick={onTagClick}
                  onEditTags={onEditTags}
                  onManageCollections={onManageCollections}
                  onCollect={onCollect}
                  onPreview={canCursorPreview ? (previewTarget) =>
                    setPreviewPet((current) => (current?.id === previewTarget.id ? null : previewTarget))
                  : undefined}
                  previewActive={previewPet?.id === pet.id}
                  onToggleNsfw={onToggleNsfw}
                  onShadowbanOwner={onShadowbanOwner}
                  onDelete={onDelete}
                  onSignIn={onSignIn}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState text="No pets found." />
      )}
      {activeSort === "random" && pets.length ? (
        <div className="randomizeControls">
          <button className="btn" type="button" disabled={loading} onClick={onRandomize}>
            {loading ? <Spinner size={14} /> : null}
            Randomize
          </button>
        </div>
      ) : activeSort === "random" || activeSort === "discussed" ? null : (
        <PaginationControls meta={meta} loading={loading} onPage={onPage} />
      )}
      {previewPet && cursorPoint && (
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
            <CursorPetPreview pet={previewPet} stateId={cursorStateId} />
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
