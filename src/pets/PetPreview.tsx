import { useEffect, useMemo, useState, type CSSProperties } from "react";
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

export function GalleryPetPreview({
  pet,
  compact,
  active
}: {
  pet: Pet;
  compact: boolean;
  active: boolean;
}) {
  const state = useMemo(() => pickGalleryPetState(pet.id), [pet.id]);
  const [fullSpriteRequested, setFullSpriteRequested] = useState(false);
  const [fullSpriteLoaded, setFullSpriteLoaded] = useState(false);
  const animatedVisible = active && fullSpriteLoaded;

  useEffect(() => {
    setFullSpriteRequested(false);
    setFullSpriteLoaded(false);
  }, [pet.id, pet.spritesheetUrl]);

  useEffect(() => {
    if (active) {
      setFullSpriteRequested(true);
    }
  }, [active]);

  useEffect(() => {
    if (!fullSpriteRequested || fullSpriteLoaded) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) setFullSpriteLoaded(true);
    };
    image.src = pet.spritesheetUrl;
    if (image.complete) {
      setFullSpriteLoaded(true);
    }
    return () => {
      cancelled = true;
    };
  }, [fullSpriteLoaded, fullSpriteRequested, pet.spritesheetUrl]);

  return (
    <div
      className={`spriteFrame transparent galleryPreviewFrame ${compact ? "compact" : ""} ${animatedVisible ? "isAnimating" : ""}`}
      aria-label={`${pet.displayName} animated preview`}
    >
      <img
        className="galleryPreviewStillImage"
        src={pet.posterUrl}
        width={192}
        height={208}
        loading="lazy"
        decoding="async"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      {fullSpriteRequested ? (
        <div
          className={`galleryPreviewSpriteLayer ${animatedVisible ? "active" : ""}`}
          aria-hidden="true"
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
      ) : null}
    </div>
  );
}
