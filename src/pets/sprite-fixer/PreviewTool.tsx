import type { PetAnimationRow } from "../../domain/config";
import type { Pet } from "../../domain/types";
import { PanelTitle, StageHeading } from "./EditorControls";
import { RowThumbnailPicker } from "./FramePickers";
import { AnimatedSprite, SpriteStrip } from "./SpriteFrames";

export function PreviewInspector() {
  return (
    <div className="spriteEditorInspectorPanel">
      <PanelTitle title="Runtime preview" label="preview only" />
      <p className="spriteEditorPlanText">Click an animation row in the workbench to inspect the pet exactly as Codex will read it.</p>
    </div>
  );
}

export function RuntimePreviewStage({
  pet,
  state,
  setRow
}: {
  pet: Pet;
  state: PetAnimationRow;
  setRow: (row: number) => void;
}) {
  return (
    <section className="spriteEditorStagePanel runtimeStage">
      <StageHeading title="Runtime preview" label={state.label} />
      <div className="spriteEditorRuntimeCanvas">
        <AnimatedSprite pet={pet} state={state} size={192} fps={8} />
      </div>
      <RowThumbnailPicker pet={pet} selectedRow={state.row} onSelect={setRow} />
      <SpriteStrip pet={pet} row={state.row} frames={state.frames} size={46} />
    </section>
  );
}
