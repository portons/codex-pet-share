import { petEditorAnimationRows } from "../../domain/config";
import type { Pet } from "../../domain/types";
import type { SpriteFrameTarget } from "../../uploads/uploadAssets";
import {
  createDefaultAlignEdit,
  formatAlignAdjustmentLabel,
  formatAlignEditLabel,
  formatAlignTargetLabel,
  formatMotionCardEditLabel,
  formatTransformCount,
  isAlignEditChanged
} from "./alignEdits";
import { rotationOptions } from "./editorConfig";
import { PanelTitle, RangeField, SegmentedControl, StageHeading } from "./EditorControls";
import { FrameStripPicker } from "./FramePickers";
import { stateForRow } from "./rowPlans";
import { AnimatedSprite, SpriteFrame } from "./SpriteFrames";
import type { AlignDraftMap, AlignEdit, AlignRotation } from "./types";

export function AlignInspector({
  busy,
  edit,
  transformCount,
  setDx,
  setDy,
  setRotate,
  reset
}: {
  busy: boolean;
  edit: AlignEdit;
  transformCount: number;
  setDx: (value: number) => void;
  setDy: (value: number) => void;
  setRotate: (value: AlignRotation) => void;
  reset: () => void;
}) {
  return (
    <div className="spriteEditorInspectorPanel">
      <PanelTitle title="Transform" />
      <p className="spriteEditorPlanText">Click a row or exact frame in the atlas, then move or rotate it inside the Codex sprite cell.</p>
      <RangeField label="Move X" min={-48} max={48} step={1} value={edit.dx} disabled={busy} valueLabel={`${edit.dx}px`} onChange={setDx} />
      <RangeField label="Move Y" min={-48} max={48} step={1} value={edit.dy} disabled={busy} valueLabel={`${edit.dy}px`} onChange={setDy} />
      <SegmentedControl<`${AlignRotation}`>
        label="Rotate"
        value={`${edit.rotate}`}
        values={rotationOptions}
        disabled={busy}
        onChange={(value) => setRotate(Number(value) as AlignRotation)}
      />
      <div className="spriteEditorInlineStats">
        <span>{formatTransformCount(transformCount)}</span>
        <button className="btn btnSm" type="button" disabled={busy || (edit.dx === 0 && edit.dy === 0 && edit.rotate === 0)} onClick={reset}>
          Reset row
        </button>
      </div>
    </div>
  );
}

export function AlignStage({
  pet,
  selectedRow,
  selectedEdit,
  edits,
  transformCount,
  setRow,
  setFrame
}: {
  pet: Pet;
  selectedRow: number;
  selectedEdit: AlignEdit;
  edits: AlignDraftMap;
  transformCount: number;
  setRow: (row: number) => void;
  setFrame: (row: number, frame: SpriteFrameTarget) => void;
}) {
  const editorStates = petEditorAnimationRows(pet.spriteVersionNumber);
  const state = stateForRow(selectedRow, pet.spriteVersionNumber);
  const previewFrame = selectedEdit.frame === "all" ? 0 : selectedEdit.frame;
  return (
    <div className="spriteEditorAlignStage">
      <section className="spriteEditorStagePanel primary spriteEditorTransformMotionPanel">
        <StageHeading title="All animation rows" label={transformCount === 0 ? "current vs after" : `after includes ${formatTransformCount(transformCount)}`} />
        <div className="spriteEditorTransformMotionGrid">
          {editorStates.map((rowState) => {
            const edit = edits[rowState.row] || createDefaultAlignEdit();
            const changed = isAlignEditChanged(edit);
            const selected = rowState.row === state.row;
            return (
              <button
                aria-label={`Preview ${rowState.label} transform context`}
                aria-pressed={selected}
                className={`spriteEditorTransformMotionCard ${selected ? "selected" : ""} ${changed ? "changed" : ""}`}
                key={rowState.id}
                type="button"
                onClick={() => setRow(rowState.row)}
              >
                <span className="spriteEditorTransformMotionMeta">
                  <strong>{rowState.label}</strong>
                  <small>{changed ? formatMotionCardEditLabel(edit) : "unchanged"}</small>
                </span>
                <span className="spriteEditorTransformMotionPreview" aria-label={`${rowState.label} current and transformed animation`}>
                  <AnimatedSprite pet={pet} state={rowState} size={54} fps={8} className="ghost" />
                  <AnimatedSprite pet={pet} state={rowState} size={54} fps={8} alignEdits={edits} className="after" />
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="spriteEditorStagePanel compact spriteEditorTransformSelectedPanel">
        <StageHeading title="Selected cell" label={formatAlignEditLabel(selectedEdit)} />
        <div className="spriteEditorAlignCanvas">
          <SpriteFrame pet={pet} row={state.row} frame={previewFrame} size={168} className="ghost" />
          <SpriteFrame
            pet={pet}
            row={state.row}
            frame={previewFrame}
            size={168}
            rotate={selectedEdit.rotate}
            shiftX={selectedEdit.dx}
            shiftY={selectedEdit.dy}
            className="shifted"
          />
        </div>
      </section>
      <section className="spriteEditorStagePanel compact spriteEditorAtlasPanel">
        <StageHeading title="Frame targets" label={transformCount === 0 ? "no transforms yet" : formatTransformCount(transformCount)} />
        <div className="spriteEditorAtlasContext">
          {editorStates.map((rowState) => {
            const edit = edits[rowState.row] || createDefaultAlignEdit();
            const shifted = isAlignEditChanged(edit);
            return (
              <article className={`${rowState.row === state.row ? "selected" : ""} ${shifted ? "shifted" : ""}`} key={rowState.id}>
                <button className="spriteEditorAtlasRowHeader" type="button" onClick={() => setRow(rowState.row)}>
                  <strong>{rowState.label}</strong>
                  <span>{shifted ? formatAlignTargetLabel(edit.frame) : "unchanged"}</span>
                  <em className={shifted ? "" : "placeholder"}>{shifted ? formatAlignAdjustmentLabel(edit) : "x 0px / y 0px"}</em>
                </button>
                <div className="spriteEditorAtlasFrames">
                  <button
                    aria-label={`Transform all frames in ${rowState.label}`}
                    aria-pressed={rowState.row === state.row && edit.frame === "all"}
                    className={`spriteEditorAllFramesButton ${rowState.row === state.row && edit.frame === "all" ? "active" : ""}`}
                    type="button"
                    onClick={() => setFrame(rowState.row, "all")}
                  >
                    All
                  </button>
                  <FrameStripPicker
                    pet={pet}
                    row={rowState.row}
                    frames={rowState.frames}
                    size={34}
                    shiftX={edit.dx}
                    shiftY={edit.dy}
                    rotate={edit.rotate}
                    shiftFrameTarget={edit.frame}
                    selectedFrame={rowState.row === state.row && edit.frame !== "all" ? edit.frame : null}
                    onSelect={(frame) => setFrame(rowState.row, frame)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
