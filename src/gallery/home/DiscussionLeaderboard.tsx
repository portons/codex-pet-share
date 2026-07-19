import { type CSSProperties } from "react";
import { formatMetric } from "../../domain/format";
import type { GalleryMeta, Pet } from "../../domain/types";
import { EmptyState } from "../../ui/EmptyState";
import { Icon } from "../../ui/Icon";
import { GallerySkeleton } from "../../ui/Skeletons";
import { PaginationControls } from "../PaginationControls";

export function DiscussionLeaderboard({
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
