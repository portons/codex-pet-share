import { useEffect, useState, type CSSProperties } from "react";
import { spriteCellHeight, spriteCellWidth, spriteSheetHeight, type PetAnimationRow } from "../../domain/config";
import type { Pet } from "../../domain/types";
import type { SpriteFrameTarget } from "../../uploads/uploadAssets";
import { alignEditForFrame } from "./alignEdits";
import { cellPlanFor } from "./rowPlans";
import type { AlignDraftMap, SpriteRowPlan } from "./types";

export function SpriteFrame({
  pet,
  row,
  frame,
  size,
  flipX = false,
  shiftX = 0,
  shiftY = 0,
  rotate = 0,
  className = ""
}: {
  pet: Pet;
  row: number;
  frame: number;
  size: number;
  flipX?: boolean;
  shiftX?: number;
  shiftY?: number;
  rotate?: number;
  className?: string;
}) {
  const scale = size / spriteCellWidth;
  const height = Math.round(spriteCellHeight * scale);
  const imageStyle: CSSProperties = {
    width: `${size}px`,
    height: `${height}px`,
    backgroundImage: `url(${pet.spritesheetUrl})`,
    backgroundPosition: `-${frame * size}px -${row * height}px`,
    backgroundSize: `${spriteCellWidth * 8 * scale}px ${spriteSheetHeight(pet.spriteVersionNumber) * scale}px`,
    transform: `translate(${shiftX * scale}px, ${shiftY * scale}px) rotate(${rotate}deg)${flipX ? " scaleX(-1)" : ""}`
  };
  return (
    <div className={`spriteFrameClip ${className}`} style={{ width: `${size}px`, height: `${height}px` }}>
      <div className="spriteFrameImage" style={imageStyle} />
    </div>
  );
}

export function AnimatedSprite({
  pet,
  state,
  rowPlan,
  alignEdits,
  size,
  fps,
  className = ""
}: {
  pet: Pet;
  state: PetAnimationRow;
  rowPlan?: SpriteRowPlan;
  alignEdits?: AlignDraftMap;
  size: number;
  fps: number;
  className?: string;
}) {
  const frame = useAnimationFrame(state.frames, fps);
  const plan = cellPlanFor(rowPlan, state.row, frame);
  const alignEdit = alignEditForFrame(alignEdits, state.row, frame);
  return (
    <SpriteFrame
      pet={pet}
      row={plan.sourceRow}
      frame={plan.sourceFrame}
      size={size}
      flipX={plan.flipX}
      shiftX={alignEdit?.dx || 0}
      shiftY={alignEdit?.dy || 0}
      rotate={alignEdit?.rotate || 0}
      className={className}
    />
  );
}

export function SpriteStrip({
  pet,
  row,
  frames,
  size,
  shiftX = 0,
  shiftY = 0,
  shiftFrameTarget = "all",
  highlightFrame
}: {
  pet: Pet;
  row: number;
  frames: number;
  size: number;
  shiftX?: number;
  shiftY?: number;
  shiftFrameTarget?: SpriteFrameTarget;
  highlightFrame?: number;
}) {
  return (
    <div className="spriteEditorStrip">
      {Array.from({ length: frames }, (_, frame) => {
        const shouldShift = shiftFrameTarget === "all" || shiftFrameTarget === frame;
        return (
          <SpriteFrame
            className={highlightFrame === frame ? "highlight" : ""}
            frame={frame}
            key={frame}
            pet={pet}
            row={row}
            shiftX={shouldShift ? shiftX : 0}
            shiftY={shouldShift ? shiftY : 0}
            size={size}
          />
        );
      })}
    </div>
  );
}

function useAnimationFrame(frameCount: number, fps: number) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    setFrame(0);
    const interval = window.setInterval(() => {
      setFrame((current) => (current + 1) % Math.max(frameCount, 1));
    }, 1000 / Math.max(fps, 1));
    return () => window.clearInterval(interval);
  }, [fps, frameCount]);
  return frame;
}
