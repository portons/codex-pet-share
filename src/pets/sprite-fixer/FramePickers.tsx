import { petEditorAnimationRows, petFrameLabel } from "../../domain/config";
import type { Pet } from "../../domain/types";
import type { SpriteFrameTarget } from "../../uploads/uploadAssets";
import { stateForRow } from "./rowPlans";
import { SpriteFrame } from "./SpriteFrames";
import type { AlignRotation } from "./types";

export function RowThumbnailPicker({
  pet,
  selectedRow,
  onSelect
}: {
  pet: Pet;
  selectedRow: number;
  onSelect: (row: number) => void;
}) {
  return (
    <div className="spriteEditorRowPicker" aria-label="Choose animation row">
      {petEditorAnimationRows(pet.spriteVersionNumber).map((state) => {
        const selected = selectedRow === state.row;
        return (
          <button
            aria-pressed={selected}
            className={selected ? "active" : ""}
            key={state.id}
            type="button"
            onClick={() => onSelect(state.row)}
          >
            <SpriteFrame pet={pet} row={state.row} frame={0} size={34} />
            <span>{state.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FrameThumbnailPicker({
  pet,
  row,
  selectedFrame,
  onSelect
}: {
  pet: Pet;
  row: number;
  selectedFrame: number;
  onSelect: (frame: number) => void;
}) {
  const state = stateForRow(row, pet.spriteVersionNumber);
  return (
    <FrameStripPicker
      frames={state.frames}
      onSelect={onSelect}
      pet={pet}
      row={row}
      selectedFrame={selectedFrame}
      size={42}
    />
  );
}

export function FrameStripPicker({
  pet,
  row,
  frames,
  size,
  selectedFrame,
  shiftX = 0,
  shiftY = 0,
  rotate = 0,
  shiftFrameTarget = "all",
  onSelect
}: {
  pet: Pet;
  row: number;
  frames: number;
  size: number;
  selectedFrame: number | null;
  shiftX?: number;
  shiftY?: number;
  rotate?: AlignRotation;
  shiftFrameTarget?: SpriteFrameTarget;
  onSelect: (frame: number) => void;
}) {
  return (
    <div className="spriteEditorFramePicker">
      {Array.from({ length: frames }, (_, frame) => {
        const shouldShift = shiftFrameTarget === "all" || shiftFrameTarget === frame;
        const selected = selectedFrame === frame;
        const hasTransform = shouldShift && (shiftX !== 0 || shiftY !== 0 || rotate !== 0);
        return (
          <button
            aria-label={`Choose ${petFrameLabel(row, frame, pet.spriteVersionNumber)}`}
            aria-pressed={selected}
            className={selected ? "active" : ""}
            key={frame}
            type="button"
            onClick={() => onSelect(frame)}
          >
            <SpriteFrame
              className={hasTransform ? "transformRef" : ""}
              frame={frame}
              pet={pet}
              row={row}
              rotate={shouldShift ? rotate : 0}
              shiftX={shouldShift ? shiftX : 0}
              shiftY={shouldShift ? shiftY : 0}
              size={size}
            />
            <span>{petFrameLabel(row, frame, pet.spriteVersionNumber)}</span>
          </button>
        );
      })}
    </div>
  );
}
