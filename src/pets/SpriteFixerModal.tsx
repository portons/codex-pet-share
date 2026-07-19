import type { FormEvent } from "react";
import type { Pet } from "../domain/types";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";
import type { PetSpriteEditorOperation } from "../uploads/uploadAssets";
import { updateAlignEdit, removeAlignEdit } from "./sprite-fixer/alignEdits";
import { AlignInspector, AlignStage } from "./sprite-fixer/AlignTool";
import { ConfirmCloseDialog } from "./sprite-fixer/ConfirmCloseDialog";
import { DirectionInspector, RepairStage } from "./sprite-fixer/DirectionTool";
import { editorTools } from "./sprite-fixer/editorConfig";
import { FramesInspector, FramesStage } from "./sprite-fixer/FramesTool";
import { PixelCleanStage, PixelInspector } from "./sprite-fixer/PixelCleanTool";
import { PreviewInspector, RuntimePreviewStage } from "./sprite-fixer/PreviewTool";
import { RowsInspector, RowsStage } from "./sprite-fixer/RowsTool";
import { useSpriteFixerEditor } from "./sprite-fixer/useSpriteFixerEditor";

export function SpriteFixerModal({
  pet,
  status,
  busy,
  onSubmit,
  onClose
}: {
  pet: Pet;
  status: string;
  busy: boolean;
  onSubmit: (event: FormEvent, operation: PetSpriteEditorOperation) => boolean | Promise<boolean>;
  onClose: () => void;
}) {
  const {
    editorStates, workbenchRef, inspectorRef,
    activeTool, setActiveTool,
    directionPair, changeDirectionPair, directionOperation, setDirectionOperation,
    selectedDirection, currentDirectionPlan, afterPlan,
    rowMap, setRowMap, updateRowMap, rowMapTargetRow, setRowMapTargetRow,
    rowMapChanged, rowMapChangeCount,
    selectedFrameState, frameIndex, setFrameIndex, sourceFrameIndex, setSourceFrameIndex, changeFrameRow,
    pixelRow, pixelFrame, pixelMode, setPixelMode, pixelZoom, setPixelZoom,
    pixelBrushSize, setPixelBrushSize, pixelTolerance, setPixelTolerance,
    pixelEdits, setPixelEdits, pixelPatchCount, changePixelRow, changePixelFrame,
    alignRow, setAlignRow, alignEdits, setAlignEdits,
    selectedAlignState, selectedAlignEdit, alignTransforms,
    selectedPreviewState, setPreviewRow,
    draftWasRestored, hasUnsavedDraft, confirmCloseOpen, setConfirmCloseOpen,
    isPreviewOnly, canSave, saveLabel, saveNote,
    submitEditor, requestClose, closeAndKeepDraft, discardDraftAndClose
  } = useSpriteFixerEditor({ pet, busy, onSubmit, onClose });

  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          requestClose();
        }
      }}
    >
      <section className="spriteEditorModal" role="dialog" aria-modal="true" aria-label={`Sprite editor for ${pet.displayName}`}>
        <div className="spriteEditorHeader">
          <div>
            <p className="metaText">Sprite editor</p>
            <h2>{pet.displayName}</h2>
            <p className="spriteEditorVersionNote">
              {pet.spriteVersionNumber !== 2 && <span className="petFormatPill v1">V1 · legacy</span>}
              {pet.spriteVersionNumber === 2
                ? "Editing all 11 rows, including the neutral look cell and 16 labeled directions."
                : "Editing the legacy 9-row format — still fully supported."}
            </p>
          </div>
          <div className="spriteEditorHeaderActions">
            {draftWasRestored ? <span className="spriteEditorDraftPill">Draft restored</span> : null}
            {hasUnsavedDraft && !draftWasRestored ? <span className="spriteEditorDraftPill">Draft saved locally</span> : null}
            <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={requestClose} disabled={busy}>
              <Icon name="close" size={12} />
              Close
            </button>
          </div>
        </div>

        <form className="spriteEditorShell" onSubmit={submitEditor}>
          <nav className="spriteEditorRail" aria-label="Sprite editor tools">
            {editorTools.map((tool) => (
              <button
                className={`spriteEditorTool ${activeTool === tool.id ? "active" : ""}`}
                key={tool.id}
                type="button"
                aria-pressed={activeTool === tool.id}
                onClick={() => setActiveTool(tool.id)}
              >
                <Icon name={tool.icon} size={15} />
                <span>{tool.label}</span>
                <small>{tool.id === "repair" && pet.spriteVersionNumber === 2 ? "run + look" : tool.kicker}</small>
              </button>
            ))}
          </nav>

          <main className="spriteEditorWorkbench" ref={workbenchRef}>
            {activeTool === "repair" ? (
              <RepairStage
                pet={pet}
                pair={directionPair}
                afterPlan={afterPlan}
                currentPlan={currentDirectionPlan}
                hasSelection={Boolean(directionOperation)}
              />
            ) : null}
            {activeTool === "rows" ? (
              <RowsStage
                pet={pet}
                rowMap={rowMap}
                selectedTargetRow={rowMapTargetRow}
                setSelectedTargetRow={setRowMapTargetRow}
                updateRowMap={updateRowMap}
              />
            ) : null}
            {activeTool === "frames" ? (
              <FramesStage
                pet={pet}
                frameState={selectedFrameState}
                frameIndex={frameIndex}
                sourceFrameIndex={sourceFrameIndex}
                setFrameRow={changeFrameRow}
                setFrameIndex={setFrameIndex}
                setSourceFrameIndex={setSourceFrameIndex}
              />
            ) : null}
            {activeTool === "clean" ? (
              <PixelCleanStage
                pet={pet}
                row={pixelRow}
                frame={pixelFrame}
                zoom={pixelZoom}
                brushSize={pixelBrushSize}
                mode={pixelMode}
                tolerance={pixelTolerance}
                edits={pixelEdits}
                setRow={changePixelRow}
                setFrame={changePixelFrame}
                setEdits={setPixelEdits}
              />
            ) : null}
            {activeTool === "align" ? (
              <AlignStage
                pet={pet}
                selectedRow={selectedAlignState.row}
                selectedEdit={selectedAlignEdit}
                edits={alignEdits}
                transformCount={alignTransforms.length}
                setRow={setAlignRow}
                setFrame={(row, frame) => {
                  setAlignRow(row);
                  updateAlignEdit(setAlignEdits, row, { frame });
                }}
              />
            ) : null}
            {activeTool === "preview" ? (
              <RuntimePreviewStage
                pet={pet}
                state={selectedPreviewState}
                setRow={setPreviewRow}
              />
            ) : null}
          </main>

          <aside className="spriteEditorInspector" aria-label="Editor controls" ref={inspectorRef}>
            {activeTool === "repair" ? (
              <DirectionInspector
                pet={pet}
                busy={busy}
                pair={directionPair}
                setPair={changeDirectionPair}
                directionOperation={directionOperation}
                setDirectionOperation={setDirectionOperation}
                selectedDirection={selectedDirection}
              />
            ) : null}
            {activeTool === "rows" ? (
              <RowsInspector
                pet={pet}
                busy={busy}
                rowMap={rowMap}
                rowMapChanged={rowMapChanged}
                rowMapChangeCount={rowMapChangeCount}
                selectedTargetRow={rowMapTargetRow}
                resetSelected={() => updateRowMap(rowMapTargetRow, rowMapTargetRow)}
                resetAll={() => setRowMap(Object.fromEntries(editorStates.map((state) => [state.row, state.row])))}
              />
            ) : null}
            {activeTool === "frames" ? (
              <FramesInspector
                busy={busy}
                frameIndex={frameIndex}
                sourceFrameIndex={sourceFrameIndex}
                clearSelection={() => {
                  setFrameIndex(null);
                  setSourceFrameIndex(null);
                }}
              />
            ) : null}
            {activeTool === "clean" ? (
              <PixelInspector
                busy={busy}
                mode={pixelMode}
                setMode={setPixelMode}
                zoom={pixelZoom}
                setZoom={setPixelZoom}
                brushSize={pixelBrushSize}
                setBrushSize={setPixelBrushSize}
                tolerance={pixelTolerance}
                setTolerance={setPixelTolerance}
                editCount={pixelPatchCount}
                clearEdits={() => setPixelEdits({})}
              />
            ) : null}
            {activeTool === "align" ? (
              <AlignInspector
                busy={busy}
                edit={selectedAlignEdit}
                transformCount={alignTransforms.length}
                setDx={(dx) => updateAlignEdit(setAlignEdits, alignRow, { dx })}
                setDy={(dy) => updateAlignEdit(setAlignEdits, alignRow, { dy })}
                setRotate={(rotate) => updateAlignEdit(setAlignEdits, alignRow, { rotate })}
                reset={() => removeAlignEdit(setAlignEdits, alignRow)}
              />
            ) : null}
            {activeTool === "preview" ? (
              <PreviewInspector />
            ) : null}

            <div className="spriteEditorActions">
              {isPreviewOnly ? (
                <button className="btn btnLg spriteEditorFullAction" type="button" disabled={busy} onClick={requestClose}>
                  Close editor
                </button>
              ) : (
                <>
                  <button className="btn btnPrimary btnLg" type="submit" disabled={!canSave}>
                    {busy ? <Spinner size={14} /> : <Icon name="check" size={14} />}
                    {busy ? "Saving" : saveLabel}
                  </button>
                  <button className="btn btnLg" type="button" disabled={busy} onClick={requestClose}>
                    Cancel
                  </button>
                </>
              )}
            </div>
            {saveNote ? <p className="spriteEditorFinePrint">{saveNote}</p> : null}
            {status ? (
              <p className="status" role="alert">
                {status}
              </p>
            ) : null}
          </aside>
        </form>
        {confirmCloseOpen ? (
          <ConfirmCloseDialog
            onKeepDraft={closeAndKeepDraft}
            onContinueEditing={() => setConfirmCloseOpen(false)}
            onDiscard={discardDraftAndClose}
          />
        ) : null}
      </section>
    </div>
  );
}
