import { petFrameLabel, type PetAnimationRow } from "../../domain/config";
import type { Pet } from "../../domain/types";
import { PanelTitle, StageHeading } from "./EditorControls";
import { RowThumbnailPicker } from "./FramePickers";
import { SpriteFrame } from "./SpriteFrames";

export function FramesInspector({
  busy,
  frameIndex,
  sourceFrameIndex,
  clearSelection
}: {
  busy: boolean;
  frameIndex: number | null;
  sourceFrameIndex: number | null;
  clearSelection: () => void;
}) {
  return (
    <div className="spriteEditorInspectorPanel">
      <PanelTitle title="Frame repair" />
      <p className="spriteEditorPlanText">Use this when one animation cell has artifacts. Click the row, click the bad frame, then click the clean replacement.</p>
      <div className="spriteEditorInlineStats">
        <span>Bad: {frameIndex === null ? "none" : `frame ${frameIndex + 1}`}</span>
        <span>Replacement: {sourceFrameIndex === null ? "none" : `frame ${sourceFrameIndex + 1}`}</span>
      </div>
      <button className="btn btnSm" type="button" disabled={busy || (frameIndex === null && sourceFrameIndex === null)} onClick={clearSelection}>
        Reset frame choice
      </button>
    </div>
  );
}

export function FramesStage({
  pet,
  frameState,
  frameIndex,
  sourceFrameIndex,
  setFrameRow,
  setFrameIndex,
  setSourceFrameIndex
}: {
  pet: Pet;
  frameState: PetAnimationRow;
  frameIndex: number | null;
  sourceFrameIndex: number | null;
  setFrameRow: (row: number) => void;
  setFrameIndex: (frame: number) => void;
  setSourceFrameIndex: (frame: number) => void;
}) {
  return (
    <div className="spriteEditorFrameRepairStage">
      <section className="spriteEditorStagePanel compact">
        <StageHeading title="Animation row" label="click row" />
        <RowThumbnailPicker pet={pet} selectedRow={frameState.row} onSelect={setFrameRow} />
      </section>
      <section className="spriteEditorStagePanel">
        <StageHeading title="Bad frame" label="click the artifact cell" />
        <FrameChoiceTimeline
          pet={pet}
          state={frameState}
          selectedFrame={frameIndex}
          pairedFrame={sourceFrameIndex}
          selectedLabel="bad"
          pairedLabel="replacement"
          onSelect={setFrameIndex}
        />
      </section>
      <section className="spriteEditorStagePanel">
        <StageHeading title="Replacement frame" label="click the clean source" />
        <FrameChoiceTimeline
          pet={pet}
          state={frameState}
          selectedFrame={sourceFrameIndex}
          pairedFrame={frameIndex}
          selectedLabel="replacement"
          pairedLabel="bad"
          onSelect={setSourceFrameIndex}
        />
      </section>
      <section className="spriteEditorStagePanel primary">
        <StageHeading
          title="After save"
          label={frameIndex === null || sourceFrameIndex === null ? "choose both frames" : `frame ${frameIndex + 1} becomes frame ${sourceFrameIndex + 1}`}
        />
        <FrameRepairPreview pet={pet} state={frameState} targetFrame={frameIndex} sourceFrame={sourceFrameIndex} />
      </section>
    </div>
  );
}

function FrameChoiceTimeline({
  pet,
  state,
  selectedFrame,
  pairedFrame,
  selectedLabel,
  pairedLabel,
  onSelect
}: {
  pet: Pet;
  state: PetAnimationRow;
  selectedFrame: number | null;
  pairedFrame: number | null;
  selectedLabel: string;
  pairedLabel: string;
  onSelect: (frame: number) => void;
}) {
  return (
    <div className="spriteEditorTimeline">
      {Array.from({ length: state.frames }, (_, frame) => {
        const selected = selectedFrame === frame;
        const paired = pairedFrame === frame;
        return (
          <button
            aria-label={`Choose ${petFrameLabel(state.row, frame, pet.spriteVersionNumber)} as ${selectedLabel}`}
            className={`spriteEditorTimelineFrame ${selected ? "selectedTarget" : ""} ${paired ? "selectedSource" : ""}`}
            key={frame}
            type="button"
            onClick={() => onSelect(frame)}
          >
            {selected ? <b>{selectedLabel}</b> : null}
            {paired ? <b className="secondary">{pairedLabel}</b> : null}
            <SpriteFrame pet={pet} row={state.row} frame={frame} size={74} />
            <span>{petFrameLabel(state.row, frame, pet.spriteVersionNumber)}</span>
          </button>
        );
      })}
    </div>
  );
}

function FrameRepairPreview({
  pet,
  state,
  targetFrame,
  sourceFrame
}: {
  pet: Pet;
  state: PetAnimationRow;
  targetFrame: number | null;
  sourceFrame: number | null;
}) {
  return (
    <div className="spriteEditorTimeline">
      {Array.from({ length: state.frames }, (_, frame) => {
        const replaced = targetFrame !== null && sourceFrame !== null && frame === targetFrame;
        return (
          <div className={`spriteEditorTimelineFrame ${replaced ? "replaced" : ""}`} key={frame}>
            {replaced ? <b>repaired</b> : null}
            <SpriteFrame pet={pet} row={state.row} frame={replaced ? sourceFrame : frame} size={74} />
            <span>{petFrameLabel(state.row, frame, pet.spriteVersionNumber)}</span>
          </div>
        );
      })}
    </div>
  );
}
