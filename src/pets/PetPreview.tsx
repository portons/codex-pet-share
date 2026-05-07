import { useMemo, type CSSProperties } from "react";
import {
  petStates,
  previewFrameCount,
  type PetState
} from "../domain/config";
import type { Pet } from "../domain/types";

export function PetSprite({
  pet,
  row,
  frames,
  label,
  size = "medium",
  transparent = false
}: {
  pet: Pet;
  row: number;
  frames: number;
  label: string;
  size?: "thumb" | "small" | "medium" | "large";
  transparent?: boolean;
}) {
  return (
    <div
      className={`spriteFrame ${transparent ? "transparent" : "checker"} ${size}`}
      aria-label={`${pet.displayName} ${label} preview`}
    >
      <div
        className="sprite"
        style={
          {
            backgroundImage: `url(${pet.spritesheetUrl})`,
            "--sprite-y": `${row * -208}px`,
            "--sprite-end-x": `${frames * -192}px`,
            "--sprite-frames": frames,
            "--sprite-duration": `${Math.max(frames * 260, 1400)}ms`
          } as CSSProperties
        }
      />
    </div>
  );
}

export function CyclingPetPreview({
  pet,
  size = "medium",
  transparent = false
}: {
  pet: Pet;
  size?: "thumb" | "medium" | "large";
  transparent?: boolean;
}) {
  return (
    <div
      className={`spriteFrame previewStripFrame ${transparent ? "transparent" : "previewSurface"} ${size}`}
      aria-label={`${pet.displayName} animated preview`}
    >
      <div
        className="previewStrip"
        style={
          {
            backgroundImage: `url(${pet.previewUrl})`,
            "--preview-end-x": `${previewFrameCount * -96}px`,
            "--preview-frames": previewFrameCount,
            "--preview-duration": `${Math.max(previewFrameCount * 300, 2000)}ms`
          } as CSSProperties
        }
      />
    </div>
  );
}

function pickGalleryPetState(petId: string): PetState {
  let hash = 0;
  for (let index = 0; index < petId.length; index += 1) {
    hash = (hash * 31 + petId.charCodeAt(index)) | 0;
  }
  return petStates[Math.abs(hash) % petStates.length];
}

export function GalleryPetPreview({ pet, compact }: { pet: Pet; compact: boolean }) {
  const state = useMemo(() => pickGalleryPetState(pet.id), [pet.id]);
  return (
    <div
      className={`spriteFrame transparent galleryPreviewFrame ${compact ? "compact" : ""}`}
      aria-label={`${pet.displayName} animated preview`}
    >
      <div
        className="sprite"
        style={
          {
            backgroundImage: `url(${pet.spritesheetUrl})`,
            "--sprite-y": `${state.row * -208}px`,
            "--sprite-end-x": `${state.frames * -192}px`,
            "--sprite-frames": state.frames,
            "--sprite-duration": `${Math.max(state.frames * 260, 1400)}ms`
          } as CSSProperties
        }
      />
    </div>
  );
}
