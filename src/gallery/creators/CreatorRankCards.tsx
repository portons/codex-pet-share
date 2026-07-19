import { type CSSProperties } from "react";
import { formatMetric } from "../../domain/format";
import { navigate } from "../../domain/routing";
import type { CreatorLeaderboardItem } from "../../domain/types";
import { Icon } from "../../ui/Icon";
import { UserAvatar } from "../../ui/UserAvatar";
import { type LeaderboardMode } from "./leaderboard-modes";

export function CreatorFeatureCard({
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

export function CreatorRankRow({
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
