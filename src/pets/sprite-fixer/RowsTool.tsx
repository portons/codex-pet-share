import { petEditorAnimationRows } from "../../domain/config";
import type { Pet } from "../../domain/types";
import { PanelTitle, StageHeading } from "./EditorControls";
import { RowThumbnailPicker } from "./FramePickers";
import { stateForRow } from "./rowPlans";
import { SpriteStrip } from "./SpriteFrames";

export function RowsInspector({
  pet,
  busy,
  rowMap,
  rowMapChanged,
  rowMapChangeCount,
  selectedTargetRow,
  resetSelected,
  resetAll
}: {
  pet: Pet;
  busy: boolean;
  rowMap: Record<number, number>;
  rowMapChanged: boolean;
  rowMapChangeCount: number;
  selectedTargetRow: number;
  resetSelected: () => void;
  resetAll: () => void;
}) {
  const selectedTarget = stateForRow(selectedTargetRow, pet.spriteVersionNumber);
  const selectedSource = stateForRow(rowMap[selectedTargetRow] ?? selectedTargetRow, pet.spriteVersionNumber);
  return (
    <div className="spriteEditorInspectorPanel">
      <PanelTitle title="State rows" />
      <p className="spriteEditorPlanText">Click a target state in the workbench, then click the uploaded row that should feed it.</p>
      <div className="spriteEditorSelectionSummary">
        <span>Target</span>
        <strong>{selectedTarget.label}</strong>
        <span>Source</span>
        <strong>{selectedSource.label}</strong>
      </div>
      <div className="spriteEditorInlineStats">
        <span>{rowMapChangeCount} remapped rows</span>
        <button className="btn btnSm" type="button" disabled={busy || (rowMap[selectedTargetRow] ?? selectedTargetRow) === selectedTargetRow} onClick={resetSelected}>
          Reset target
        </button>
      </div>
      <button className="btn btnSm" type="button" disabled={busy || !rowMapChanged} onClick={resetAll}>
        Reset all row maps
      </button>
      {!rowMapChanged ? <p className="spriteEditorInspectorNote">Change at least one target row to save a remap.</p> : null}
    </div>
  );
}

export function RowsStage({
  pet,
  rowMap,
  selectedTargetRow,
  setSelectedTargetRow,
  updateRowMap
}: {
  pet: Pet;
  rowMap: Record<number, number>;
  selectedTargetRow: number;
  setSelectedTargetRow: (row: number) => void;
  updateRowMap: (targetRow: number, sourceRow: number) => void;
}) {
  const editorStates = petEditorAnimationRows(pet.spriteVersionNumber);
  const selectedTarget = stateForRow(selectedTargetRow, pet.spriteVersionNumber);
  const selectedSourceRow = rowMap[selectedTargetRow] ?? selectedTargetRow;
  return (
    <div className="spriteEditorRowsStage">
      <section className="spriteEditorStagePanel">
        <StageHeading title="Target states" label="click target" />
        <div className="spriteEditorRowPreviewGrid">
          {editorStates.map((targetState) => {
            const sourceRow = rowMap[targetState.row] ?? targetState.row;
            const sourceState = stateForRow(sourceRow, pet.spriteVersionNumber);
            const selected = selectedTargetRow === targetState.row;
            return (
              <button
                aria-pressed={selected}
                className={`spriteEditorRowPreviewCard ${selected ? "active" : ""}`}
                key={targetState.id}
                type="button"
                onClick={() => setSelectedTargetRow(targetState.row)}
              >
                <header>
                  <strong>{targetState.label}</strong>
                  <span>from {sourceState.label}</span>
                </header>
                <SpriteStrip pet={pet} row={sourceRow} frames={targetState.frames} size={34} />
              </button>
            );
          })}
        </div>
      </section>
      <section className="spriteEditorStagePanel primary">
        <StageHeading title={`Source for ${selectedTarget.label}`} label="click source row" />
        <RowThumbnailPicker
          pet={pet}
          selectedRow={selectedSourceRow}
          onSelect={(sourceRow) => updateRowMap(selectedTargetRow, sourceRow)}
        />
        <SpriteStrip pet={pet} row={selectedSourceRow} frames={selectedTarget.frames} size={46} />
      </section>
    </div>
  );
}
