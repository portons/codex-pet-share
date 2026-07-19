import type { CollectionSummary } from "../../domain/types";

export function CollectionPosterMosaic({
  collection,
  compact = false,
  effect
}: {
  collection: CollectionSummary;
  compact?: boolean;
  effect?: "stack" | "ambient";
}) {
  const pets = collection.topPets.slice(0, compact ? 3 : 4);
  if (!pets.length) return <span className="collectionPosterEmpty">No pets yet</span>;

  return (
    <div
      className={`collectionPosterMosaic ${compact ? "compact" : ""} ${effect ? `${effect}Poc` : ""} petCount${pets.length}`}
      aria-hidden="true"
    >
      {pets.map((pet, index) => (
        <span className="collectionPosterTile" key={pet.id}>
          <img
            alt=""
            decoding="async"
            draggable={false}
            height={208}
            loading={index === 0 ? "eager" : "lazy"}
            src={pet.posterUrl}
            width={192}
          />
        </span>
      ))}
    </div>
  );
}
