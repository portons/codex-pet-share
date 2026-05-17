import { Icon } from "../ui/Icon";
import { formatMetric } from "../domain/format";
import { isTagName, type TagName } from "../domain/config";
import { navigate } from "../domain/routing";
import { isNsfwPet } from "../domain/pets";
import type { Pet } from "../domain/types";

export function PetStats({
  pet,
  size = "normal"
}: {
  pet: Pet;
  size?: "normal" | "large";
}) {
  return (
    <div className={`petStats ${size}`}>
      <span>
        <Icon name="eye" size={13} />
        {formatMetric(pet.viewCount)}
      </span>
      <span>
        <Icon name="heart" size={13} />
        {formatMetric(pet.likeCount)}
      </span>
      <span>
        <Icon name="comment" size={13} />
        {formatMetric(pet.commentCount)}
      </span>
    </div>
  );
}

export function PetTags({
  tags,
  interactive = true,
  onTagClick
}: {
  tags: string[];
  interactive?: boolean;
  onTagClick?: (tag: TagName, sourceTags: string[]) => void;
}) {
  if (!tags.length) {
    return null;
  }
  return (
    <div className="petTags">
      {tags.map((tag) =>
        interactive ? (
          <button
            className={tag === "nsfw" ? "nsfwTag" : ""}
            key={tag}
            type="button"
            onClick={() => isTagName(tag) && onTagClick?.(tag, tags)}
          >
            {tag}
          </button>
        ) : (
          <span className={tag === "nsfw" ? "nsfwTag" : ""} key={tag}>{tag}</span>
        )
      )}
    </div>
  );
}

export function NsfwNotice({ pet }: { pet: Pet }) {
  if (!isNsfwPet(pet)) {
    return null;
  }
  return <p className="nsfwNotice">NSFW</p>;
}

export function OwnerLabel({ pet, className = "metaText" }: { pet: Pet; className?: string }) {
  const shadowbanIcon = pet.ownerShadowbanned ? (
    <span className="shadowbanIcon" title="Shadowbanned">
      <Icon name="ban" size={12} />
    </span>
  ) : null;
  if (!pet.ownerId) {
    return (
      <span className={className}>
        {pet.ownerName}
        {shadowbanIcon}
      </span>
    );
  }
  return (
    <button className={`ownerLink ${className}`} type="button" onClick={() => navigate(`/users/${pet.ownerHandle || pet.ownerId}`)}>
      {pet.ownerName}
      {shadowbanIcon}
    </button>
  );
}
