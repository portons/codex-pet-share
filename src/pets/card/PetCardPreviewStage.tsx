import type { Pet } from "../../domain/types";
import { GalleryPetPreview } from "../PetPreview";

export function PetCardPreviewStage({
  pet,
  compact,
  active,
  onOpen
}: {
  pet: Pet;
  compact: boolean;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button className="petCardPreview" type="button" onClick={onOpen}>
      <GalleryPetPreview pet={pet} compact={compact} active={active} />
    </button>
  );
}
