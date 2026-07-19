import { type KeyboardEvent } from "react";
import { type TagName } from "../../domain/config";
import type { Pet } from "../../domain/types";
import { NsfwNotice, OwnerLabel, PetStats, PetTags } from "../PetMeta";
import { stopCardPropagation } from "./card-events";

export function PetCardBody({
  pet,
  compact,
  onOpen,
  onTagClick
}: {
  pet: Pet;
  compact: boolean;
  onOpen: () => void;
  onTagClick: (tag: TagName, sourceTags: string[]) => void;
}) {
  const handleCardBodyKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    onOpen();
  };

  return (
    <div
      className="petCardBody clickable"
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleCardBodyKeyDown}
    >
      <div className="cardMeta">
        <div className="petCardIdentity">
          <h2>{pet.displayName}</h2>
          <div
            className="petCardOwner"
            onClick={stopCardPropagation}
            onMouseOver={stopCardPropagation}
            onPointerDown={stopCardPropagation}
          >
            by <OwnerLabel pet={pet} />
            {pet.spriteVersionNumber !== 2 && <span className="petFormatPill v1">V1 · legacy</span>}
          </div>
        </div>
        {!compact && <PetStats pet={pet} />}
      </div>
      <NsfwNotice pet={pet} />
      {!compact && <p className="petCardDescription">{pet.description}</p>}
      {!compact && pet.tags.length > 0 && (
        <div
          className="petCardTags"
          onClick={stopCardPropagation}
          onMouseOver={stopCardPropagation}
          onPointerDown={stopCardPropagation}
        >
          <PetTags tags={pet.tags} onTagClick={onTagClick} />
        </div>
      )}
    </div>
  );
}
