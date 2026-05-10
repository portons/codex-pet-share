import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type PointerEvent,
  type SetStateAction
} from "react";
import { petStates, spriteCellHeight, spriteCellWidth, type PetState } from "../domain/config";
import type { Pet } from "../domain/types";
import { Icon, type IconName } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";
import type {
  PetSpriteEditorOperation,
  SpriteFrameTransform,
  SpriteFixOperation,
  SpriteFrameTarget,
  SpritePixelPatch
} from "../uploads/uploadAssets";
import { fetchPetPackageSpritesheet } from "../uploads/uploadAssets";

type EditorToolId = "repair" | "rows" | "frames" | "clean" | "align" | "preview";
type SpriteRowPlan = Record<number, { sourceRow: number; flipX: boolean }>;
type PixelMode = "erase" | "restore" | "sample";
type AlignRotation = 0 | 90 | 180 | 270;
type PixelPatchMap = Record<string, SpritePixelPatch>;
type AlignEdit = { frame: SpriteFrameTarget; dx: number; dy: number; rotate: AlignRotation };
type AlignDraftMap = Record<number, AlignEdit>;
type SpriteEditorDraft = {
  version: 1;
  activeTool: EditorToolId;
  directionOperation: SpriteFixOperation | null;
  rowMap: Record<number, number>;
  frameRow: number;
  frameIndex: number | null;
  sourceFrameIndex: number | null;
  pixelRow: number;
  pixelFrame: number;
  pixelMode: PixelMode;
  pixelZoom: number;
  pixelBrushSize: number;
  pixelTolerance: number;
  pixelEdits: PixelPatchMap;
  alignRow: number;
  alignEdits: AlignDraftMap;
};

const spriteEditorDraftPrefix = "codex-pet-share.sprite-editor-draft.";

const editorTools = [
  { id: "repair", label: "Direction", icon: "swap", kicker: "run rows" },
  { id: "rows", label: "Rows", icon: "sheet", kicker: "state map" },
  { id: "frames", label: "Frames", icon: "copy", kicker: "repair" },
  { id: "clean", label: "Clean", icon: "sparkle", kicker: "pixels" },
  { id: "align", label: "Transform", icon: "move", kicker: "row/frame" },
  { id: "preview", label: "Preview", icon: "play", kicker: "runtime" }
] as const satisfies Array<{ id: EditorToolId; label: string; icon: IconName; kicker: string }>;

const directionOptions = [
  {
    id: "swap-running-rows",
    label: "Swap run rows",
    detail: "The uploaded Run left and Run right rows are reversed.",
    action: "Save swapped rows"
  },
  {
    id: "mirror-right-to-left",
    label: "Mirror right into left",
    detail: "Run right is correct. Rebuild Run left from that row.",
    action: "Save mirrored left"
  },
  {
    id: "mirror-left-to-right",
    label: "Mirror left into right",
    detail: "Run left is correct. Rebuild Run right from that row.",
    action: "Save mirrored right"
  }
] as const satisfies Array<{ id: SpriteFixOperation; label: string; detail: string; action: string }>;

const currentRunPlan: SpriteRowPlan = {
  1: { sourceRow: 1, flipX: false },
  2: { sourceRow: 2, flipX: false }
};

const pixelModes = [
  { id: "erase", label: "Erase" },
  { id: "restore", label: "Restore" },
  { id: "sample", label: "Sample" }
] as const satisfies Array<{ id: PixelMode; label: string }>;

const rotationOptions = [
  { id: "0", label: "0" },
  { id: "90", label: "90" },
  { id: "180", label: "180" },
  { id: "270", label: "270" }
] as const satisfies Array<{ id: `${AlignRotation}`; label: string }>;

function stateForRow(row: number) {
  return petStates.find((state) => state.row === row) || petStates[0];
}

function rowPlanForOperation(operation: SpriteFixOperation): SpriteRowPlan {
  if (operation === "mirror-right-to-left") {
    return {
      1: { sourceRow: 1, flipX: false },
      2: { sourceRow: 1, flipX: true }
    };
  }
  if (operation === "mirror-left-to-right") {
    return {
      1: { sourceRow: 2, flipX: true },
      2: { sourceRow: 2, flipX: false }
    };
  }
  return {
    1: { sourceRow: 2, flipX: false },
    2: { sourceRow: 1, flipX: false }
  };
}

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
  const initialDraft = useMemo(() => readSpriteEditorDraft(pet.id), [pet.id]);
  const [activeTool, setActiveTool] = useState<EditorToolId>(initialDraft?.activeTool || "repair");
  const [directionOperation, setDirectionOperation] = useState<SpriteFixOperation | null>(initialDraft?.directionOperation || null);
  const [rowMap, setRowMap] = useState<Record<number, number>>(() =>
    initialDraft?.rowMap || Object.fromEntries(petStates.map((state) => [state.row, state.row]))
  );
  const [rowMapTargetRow, setRowMapTargetRow] = useState(1);
  const [frameRow, setFrameRow] = useState(initialDraft?.frameRow ?? 1);
  const [frameIndex, setFrameIndex] = useState<number | null>(initialDraft?.frameIndex ?? null);
  const [sourceFrameIndex, setSourceFrameIndex] = useState<number | null>(initialDraft?.sourceFrameIndex ?? null);
  const [pixelRow, setPixelRow] = useState(initialDraft?.pixelRow ?? 0);
  const [pixelFrame, setPixelFrame] = useState(initialDraft?.pixelFrame ?? 0);
  const [pixelMode, setPixelMode] = useState<PixelMode>(initialDraft?.pixelMode || "erase");
  const [pixelZoom, setPixelZoom] = useState(initialDraft?.pixelZoom ?? 5);
  const [pixelBrushSize, setPixelBrushSize] = useState(initialDraft?.pixelBrushSize ?? 3);
  const [pixelTolerance, setPixelTolerance] = useState(initialDraft?.pixelTolerance ?? 20);
  const [pixelEdits, setPixelEdits] = useState<PixelPatchMap>(initialDraft?.pixelEdits || {});
  const [alignRow, setAlignRow] = useState(initialDraft?.alignRow ?? 1);
  const [alignEdits, setAlignEdits] = useState<AlignDraftMap>(initialDraft?.alignEdits || {});
  const [previewRow, setPreviewRow] = useState(1);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [draftWasRestored, setDraftWasRestored] = useState(Boolean(initialDraft));
  const workbenchRef = useRef<HTMLElement | null>(null);
  const inspectorRef = useRef<HTMLElement | null>(null);

  const afterPlan = useMemo(() => directionOperation ? rowPlanForOperation(directionOperation) : currentRunPlan, [directionOperation]);
  const selectedDirection = directionOptions.find((option) => option.id === directionOperation) || null;
  const selectedFrameState = stateForRow(frameRow);
  const selectedAlignState = stateForRow(alignRow);
  const selectedAlignEdit = alignEdits[alignRow] || createDefaultAlignEdit();
  const selectedPreviewState = stateForRow(previewRow);
  const rowMapChanged = petStates.some((state) => (rowMap[state.row] ?? state.row) !== state.row);
  const rowMapChangeCount = petStates.filter((state) => (rowMap[state.row] ?? state.row) !== state.row).length;
  const pixelPatchCount = Object.keys(pixelEdits).length;
  const alignTransforms = useMemo(() => serializeAlignTransforms(alignEdits), [alignEdits]);
  const alignMoved = alignTransforms.length > 0;
  const frameRepairReady = frameIndex !== null && sourceFrameIndex !== null && frameIndex !== sourceFrameIndex;
  const hasFrameDraft = frameIndex !== null || sourceFrameIndex !== null;
  const hasUnsavedDraft = Boolean(directionOperation) || rowMapChanged || hasFrameDraft || pixelPatchCount > 0 || alignMoved;
  const isPreviewOnly = activeTool === "preview";
  const canSave =
    !busy
    && !isPreviewOnly
    && (activeTool !== "repair" || Boolean(directionOperation))
    && (activeTool !== "rows" || rowMapChanged)
    && (activeTool !== "frames" || frameRepairReady)
    && (activeTool !== "clean" || pixelPatchCount > 0)
    && (activeTool !== "align" || alignMoved);
  const saveLabel = saveLabelForTool(activeTool, selectedDirection?.action || "Choose repair");
  const saveNote = saveNoteForTool(activeTool, Boolean(directionOperation), rowMapChanged, frameRepairReady, pixelPatchCount, alignMoved);

  useEffect(() => {
    if (!hasUnsavedDraft) {
      clearSpriteEditorDraft(pet.id);
      return;
    }
    writeSpriteEditorDraft(pet.id, {
      version: 1,
      activeTool,
      directionOperation,
      rowMap,
      frameRow,
      frameIndex,
      sourceFrameIndex,
      pixelRow,
      pixelFrame,
      pixelMode,
      pixelZoom,
      pixelBrushSize,
      pixelTolerance,
      pixelEdits,
      alignRow,
      alignEdits
    });
  }, [
    activeTool,
    alignEdits,
    alignMoved,
    alignRow,
    directionOperation,
    frameIndex,
    frameRow,
    hasFrameDraft,
    hasUnsavedDraft,
    pet.id,
    pixelBrushSize,
    pixelEdits,
    pixelFrame,
    pixelMode,
    pixelPatchCount,
    pixelRow,
    pixelTolerance,
    pixelZoom,
    rowMap,
    rowMapChanged,
    sourceFrameIndex
  ]);

  useEffect(() => {
    if (!hasUnsavedDraft) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedDraft]);

  useEffect(() => {
    workbenchRef.current?.scrollTo({ left: 0, top: 0 });
    inspectorRef.current?.scrollTo({ left: 0, top: 0 });
  }, [activeTool]);

  async function submitEditor(event: FormEvent) {
    if (!canSave) {
      event.preventDefault();
      return;
    }
    const saved = await onSubmit(event, operationForTool());
    if (saved) {
      clearSpriteEditorDraft(pet.id);
      setDraftWasRestored(false);
    }
  }

  function requestClose() {
    if (busy) return;
    if (hasUnsavedDraft) {
      setConfirmCloseOpen(true);
      return;
    }
    onClose();
  }

  function closeAndKeepDraft() {
    setConfirmCloseOpen(false);
    onClose();
  }

  function discardDraftAndClose() {
    clearSpriteEditorDraft(pet.id);
    setConfirmCloseOpen(false);
    onClose();
  }

  function operationForTool(): PetSpriteEditorOperation {
    if (activeTool === "rows") {
      return { kind: "remap-rows", rowMap };
    }
    if (activeTool === "frames") {
      if (frameIndex === null || sourceFrameIndex === null) {
        throw new Error("Choose a bad frame and replacement frame before saving.");
      }
      return { kind: "replace-frame", row: frameRow, frame: frameIndex, sourceFrame: sourceFrameIndex };
    }
    if (activeTool === "clean") {
      return { kind: "pixel-patch", row: pixelRow, frame: pixelFrame, pixels: Object.values(pixelEdits) };
    }
    if (activeTool === "align") {
      return { kind: "transform-frames", transforms: alignTransforms };
    }
    if (!directionOperation) {
      throw new Error("Choose a direction repair before saving.");
    }
    return { kind: directionOperation };
  }

  function updateRowMap(targetRow: number, sourceRow: number) {
    setRowMap((current) => ({ ...current, [targetRow]: sourceRow }));
  }

  function changeFrameRow(row: number) {
    setFrameRow(row);
    setFrameIndex(null);
    setSourceFrameIndex(null);
  }

  function changePixelRow(row: number) {
    setPixelRow(row);
    setPixelFrame((current) => Math.min(current, stateForRow(row).frames - 1));
    setPixelEdits({});
  }

  function changePixelFrame(frame: number) {
    setPixelFrame(frame);
    setPixelEdits({});
  }

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
                <small>{tool.kicker}</small>
              </button>
            ))}
          </nav>

          <main className="spriteEditorWorkbench" ref={workbenchRef}>
            {activeTool === "repair" ? (
              <RepairStage pet={pet} afterPlan={afterPlan} currentPlan={currentRunPlan} hasSelection={Boolean(directionOperation)} />
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
                busy={busy}
                directionOperation={directionOperation}
                setDirectionOperation={setDirectionOperation}
                selectedDirection={selectedDirection}
              />
            ) : null}
            {activeTool === "rows" ? (
              <RowsInspector
                busy={busy}
                rowMap={rowMap}
                rowMapChanged={rowMapChanged}
                rowMapChangeCount={rowMapChangeCount}
                selectedTargetRow={rowMapTargetRow}
                resetSelected={() => updateRowMap(rowMapTargetRow, rowMapTargetRow)}
                resetAll={() => setRowMap(Object.fromEntries(petStates.map((state) => [state.row, state.row])))}
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
          <div className="spriteEditorConfirmOverlay" role="alertdialog" aria-modal="true" aria-label="Unsaved sprite draft">
            <div className="spriteEditorConfirmPanel">
              <h3>Close without submitting?</h3>
              <p>You have sprite edits that have not been submitted. They are saved locally as a draft for this pet, but the pet package will not change until you save.</p>
              <div className="spriteEditorConfirmActions">
                <button className="btn btnPrimary btnLg" type="button" onClick={closeAndKeepDraft}>
                  Close and keep draft
                </button>
                <button className="btn btnLg" type="button" onClick={() => setConfirmCloseOpen(false)}>
                  Continue editing
                </button>
                <button className="btn btnSm btnGhost" type="button" onClick={discardDraftAndClose}>
                  Discard draft
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DirectionInspector({
  busy,
  directionOperation,
  setDirectionOperation,
  selectedDirection
}: {
  busy: boolean;
  directionOperation: SpriteFixOperation | null;
  setDirectionOperation: (operation: SpriteFixOperation) => void;
  selectedDirection: (typeof directionOptions)[number] | null;
}) {
  return (
    <div className="spriteEditorInspectorPanel">
      <PanelTitle title="Run direction" />
      <p className="spriteEditorPlanText">Pick the smallest repair that makes the running rows match their runtime meaning.</p>
      <div className="spriteEditorOptionStack" role="radiogroup" aria-label="Run direction repair">
        {directionOptions.map((option) => (
          <label className={`spriteEditorOption ${directionOperation === option.id ? "active" : ""}`} key={option.id}>
            <input
              checked={directionOperation === option.id}
              disabled={busy}
              name="spriteDirectionOperation"
              onChange={() => setDirectionOperation(option.id)}
              type="radio"
              value={option.id}
            />
            <span>{option.label}</span>
            <small>{option.detail}</small>
          </label>
        ))}
      </div>
      <p className="spriteEditorInspectorNote">{selectedDirection?.detail || "Choose one repair to preview and save it."}</p>
    </div>
  );
}

function RowsInspector({
  busy,
  rowMap,
  rowMapChanged,
  rowMapChangeCount,
  selectedTargetRow,
  resetSelected,
  resetAll
}: {
  busy: boolean;
  rowMap: Record<number, number>;
  rowMapChanged: boolean;
  rowMapChangeCount: number;
  selectedTargetRow: number;
  resetSelected: () => void;
  resetAll: () => void;
}) {
  const selectedTarget = stateForRow(selectedTargetRow);
  const selectedSource = stateForRow(rowMap[selectedTargetRow] ?? selectedTargetRow);
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

function FramesInspector({
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

function PixelInspector({
  busy,
  mode,
  setMode,
  zoom,
  setZoom,
  brushSize,
  setBrushSize,
  tolerance,
  setTolerance,
  editCount,
  clearEdits
}: {
  busy: boolean;
  mode: PixelMode;
  setMode: (mode: PixelMode) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  tolerance: number;
  setTolerance: (value: number) => void;
  editCount: number;
  clearEdits: () => void;
}) {
  return (
    <div className="spriteEditorInspectorPanel">
      <PanelTitle title="Pixel clean" />
      <p className="spriteEditorPlanText">Click a row and frame in the workbench, then edit the chosen cell at true pixel level.</p>
      <SegmentedControl<PixelMode> label="Tool" value={mode} values={pixelModes} disabled={busy} onChange={setMode} />
      <RangeField label="Zoom" min={2} max={10} step={1} value={zoom} disabled={busy} valueLabel={`${zoom}x`} onChange={setZoom} />
      <RangeField
        label="Brush"
        min={1}
        max={15}
        step={2}
        value={brushSize}
        disabled={busy || mode === "sample"}
        valueLabel={`${brushSize}px`}
        onChange={setBrushSize}
      />
      <RangeField
        label="Sample tolerance"
        min={0}
        max={96}
        step={1}
        value={tolerance}
        disabled={busy || mode !== "sample"}
        valueLabel={`${tolerance}`}
        onChange={setTolerance}
      />
      <div className="spriteEditorInlineStats">
        <span>{editCount} changed pixels</span>
        <button className="btn btnSm" type="button" disabled={busy || editCount === 0} onClick={clearEdits}>
          Reset draft
        </button>
      </div>
    </div>
  );
}

function AlignInspector({
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

function PreviewInspector() {
  return (
    <div className="spriteEditorInspectorPanel">
      <PanelTitle title="Runtime preview" label="preview only" />
      <p className="spriteEditorPlanText">Click an animation row in the workbench to inspect the pet exactly as Codex will read it.</p>
    </div>
  );
}

function RepairStage({
  pet,
  afterPlan,
  currentPlan,
  hasSelection
}: {
  pet: Pet;
  afterPlan: SpriteRowPlan;
  currentPlan: SpriteRowPlan;
  hasSelection: boolean;
}) {
  return (
    <section className="spriteEditorStagePanel primary directionStage">
      <StageHeading title="Run direction repair" label={hasSelection ? "previewing selected edit" : "choose repair"} />
      <div className="spriteEditorDirectionCompare">
        <div className="spriteEditorDirectionColumn current">
          <div className="spriteEditorDirectionColumnHead">
            <h4>Current upload</h4>
            <span>before edit</span>
          </div>
          <div className="spriteEditorRunPair compact">
            <RunPreviewTile pet={pet} state={stateForRow(2)} rowPlan={currentPlan} side="left" size="small" />
            <RunPreviewTile pet={pet} state={stateForRow(1)} rowPlan={currentPlan} side="right" size="small" />
          </div>
        </div>
        <div className="spriteEditorDirectionColumn after">
          <div className="spriteEditorDirectionColumnHead">
            <h4>{hasSelection ? "After save" : "Choose repair"}</h4>
            <span>{hasSelection ? "left row runs left, right row runs right" : "no direction edit selected"}</span>
          </div>
          <div className="spriteEditorRunPair">
            <RunPreviewTile pet={pet} state={stateForRow(2)} rowPlan={afterPlan} side="left" size="large" />
            <RunPreviewTile pet={pet} state={stateForRow(1)} rowPlan={afterPlan} side="right" size="large" />
          </div>
        </div>
      </div>
      <div className="spriteEditorDirectionStrips">
        <article>
          <header>
            <strong>Run left row</strong>
            <span>{hasSelection ? "after save" : "current"}</span>
          </header>
          <RunPlanStrip pet={pet} state={stateForRow(2)} rowPlan={afterPlan} size={36} />
        </article>
        <article>
          <header>
            <strong>Run right row</strong>
            <span>{hasSelection ? "after save" : "current"}</span>
          </header>
          <RunPlanStrip pet={pet} state={stateForRow(1)} rowPlan={afterPlan} size={36} />
        </article>
      </div>
    </section>
  );
}

function RowsStage({
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
  const selectedTarget = stateForRow(selectedTargetRow);
  const selectedSourceRow = rowMap[selectedTargetRow] ?? selectedTargetRow;
  return (
    <div className="spriteEditorRowsStage">
      <section className="spriteEditorStagePanel">
        <StageHeading title="Target states" label="click target" />
        <div className="spriteEditorRowPreviewGrid">
          {petStates.map((targetState) => {
            const sourceRow = rowMap[targetState.row] ?? targetState.row;
            const sourceState = stateForRow(sourceRow);
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

function FramesStage({
  pet,
  frameState,
  frameIndex,
  sourceFrameIndex,
  setFrameRow,
  setFrameIndex,
  setSourceFrameIndex
}: {
  pet: Pet;
  frameState: PetState;
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

function PixelCleanStage({
  pet,
  row,
  frame,
  zoom,
  brushSize,
  mode,
  tolerance,
  edits,
  setRow,
  setFrame,
  setEdits
}: {
  pet: Pet;
  row: number;
  frame: number;
  zoom: number;
  brushSize: number;
  mode: PixelMode;
  tolerance: number;
  edits: PixelPatchMap;
  setRow: (row: number) => void;
  setFrame: (frame: number) => void;
  setEdits: Dispatch<SetStateAction<PixelPatchMap>>;
}) {
  const { imageData, loading, error } = useSpriteCellImageData(pet.downloadUrl, row, frame);
  const editCount = Object.keys(edits).length;

  const applyBrush = useCallback((x: number, y: number) => {
    if (!imageData || mode === "sample") return;
    const radius = Math.floor(brushSize / 2);
    setEdits((current) => {
      const next = { ...current };
      for (let py = y - radius; py <= y + radius; py += 1) {
        for (let px = x - radius; px <= x + radius; px += 1) {
          if (px < 0 || py < 0 || px >= spriteCellWidth || py >= spriteCellHeight) continue;
          const key = pixelKey(px, py);
          if (mode === "restore") {
            delete next[key];
            continue;
          }
          const index = (py * spriteCellWidth + px) * 4;
          next[key] = {
            x: px,
            y: py,
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: 0
          };
        }
      }
      return next;
    });
  }, [brushSize, imageData, mode, setEdits]);

  const applySample = useCallback((x: number, y: number) => {
    if (!imageData) return;
    const sampleIndex = (y * spriteCellWidth + x) * 4;
    const sampleR = imageData.data[sampleIndex];
    const sampleG = imageData.data[sampleIndex + 1];
    const sampleB = imageData.data[sampleIndex + 2];
    const toleranceSquared = tolerance * tolerance;
    setEdits((current) => {
      const next = { ...current };
      for (let py = 0; py < spriteCellHeight; py += 1) {
        for (let px = 0; px < spriteCellWidth; px += 1) {
          const index = (py * spriteCellWidth + px) * 4;
          if (imageData.data[index + 3] === 0) continue;
          const dr = imageData.data[index] - sampleR;
          const dg = imageData.data[index + 1] - sampleG;
          const db = imageData.data[index + 2] - sampleB;
          if (dr * dr + dg * dg + db * db <= toleranceSquared) {
            next[pixelKey(px, py)] = {
              x: px,
              y: py,
              r: imageData.data[index],
              g: imageData.data[index + 1],
              b: imageData.data[index + 2],
              a: 0
            };
          }
        }
      }
      return next;
    });
  }, [imageData, setEdits, tolerance]);

  return (
    <section className="spriteEditorStagePanel pixelStage">
      <StageHeading title="Pixel clean" label={`${stateForRow(row).label}, frame ${frame + 1}`} />
      <div className="spriteEditorCellPicker">
        <RowThumbnailPicker pet={pet} selectedRow={row} onSelect={setRow} />
        <FrameThumbnailPicker pet={pet} row={row} selectedFrame={frame} onSelect={setFrame} />
      </div>
      {loading ? <div className="spriteEditorLoading">Loading cell pixels</div> : null}
      {error ? <div className="spriteEditorLoading error">{error}</div> : null}
      {imageData ? (
        <div className="spriteEditorPixelLayout">
          <PixelCleanCanvas
            imageData={imageData}
            edits={edits}
            zoom={zoom}
            brushSize={brushSize}
            mode={mode}
            onPaint={applyBrush}
            onSample={applySample}
          />
          <aside className="spriteEditorPixelPreview">
            <div>
              <span>Original</span>
              <SpriteFrame pet={pet} row={row} frame={frame} size={96} />
            </div>
            <div>
              <span>Draft</span>
              <PixelMiniPreview imageData={imageData} edits={edits} />
            </div>
            <p>{editCount === 0 ? "No pixel edits yet." : `${editCount} pixels will be written into this cell.`}</p>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function AlignStage({
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
  const state = stateForRow(selectedRow);
  const previewFrame = selectedEdit.frame === "all" ? 0 : selectedEdit.frame;
  return (
    <div className="spriteEditorAlignStage">
      <section className="spriteEditorStagePanel primary spriteEditorTransformMotionPanel">
        <StageHeading title="All animation rows" label={transformCount === 0 ? "current vs after" : `after includes ${formatTransformCount(transformCount)}`} />
        <div className="spriteEditorTransformMotionGrid">
          {petStates.map((rowState) => {
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
          <div className="spriteEditorAlignGround" />
        </div>
      </section>
      <section className="spriteEditorStagePanel compact spriteEditorAtlasPanel">
        <StageHeading title="Frame targets" label={transformCount === 0 ? "no transforms yet" : formatTransformCount(transformCount)} />
        <div className="spriteEditorAtlasContext">
          {petStates.map((rowState) => {
            const edit = edits[rowState.row] || createDefaultAlignEdit();
            const shifted = isAlignEditChanged(edit);
            return (
              <article className={`${rowState.row === state.row ? "selected" : ""} ${shifted ? "shifted" : ""}`} key={rowState.id}>
                <button className="spriteEditorAtlasRowHeader" type="button" onClick={() => setRow(rowState.row)}>
                  <strong>{rowState.label}</strong>
                  <span>{shifted ? formatAlignTargetLabel(edit.frame) : "unchanged"}</span>
                  {shifted ? <em>{formatAlignAdjustmentLabel(edit)}</em> : null}
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

function RuntimePreviewStage({
  pet,
  state,
  setRow
}: {
  pet: Pet;
  state: PetState;
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

function RunPreviewTile({
  pet,
  state,
  rowPlan,
  side,
  size
}: {
  pet: Pet;
  state: PetState;
  rowPlan: SpriteRowPlan;
  side: "left" | "right";
  size: "small" | "large";
}) {
  const previewSize = size === "large" ? 142 : 86;
  return (
    <article className={`spriteEditorRunTile ${side} ${size}`}>
      <header>
        <strong>{state.label}</strong>
        <span>{side} side</span>
      </header>
      <AnimatedSprite pet={pet} state={state} rowPlan={rowPlan} size={previewSize} fps={8} />
    </article>
  );
}

function RowThumbnailPicker({
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
      {petStates.map((state) => {
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

function FrameThumbnailPicker({
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
  const state = stateForRow(row);
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

function FrameStripPicker({
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
        return (
          <button
            aria-label={`Choose frame ${frame + 1}`}
            aria-pressed={selected}
            className={selected ? "active" : ""}
            key={frame}
            type="button"
            onClick={() => onSelect(frame)}
          >
            <SpriteFrame
              frame={frame}
              pet={pet}
              row={row}
              rotate={shouldShift ? rotate : 0}
              shiftX={shouldShift ? shiftX : 0}
              shiftY={shouldShift ? shiftY : 0}
              size={size}
            />
            <span>{frame + 1}</span>
          </button>
        );
      })}
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
  state: PetState;
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
            aria-label={`Choose frame ${frame + 1} as ${selectedLabel}`}
            className={`spriteEditorTimelineFrame ${selected ? "selectedTarget" : ""} ${paired ? "selectedSource" : ""}`}
            key={frame}
            type="button"
            onClick={() => onSelect(frame)}
          >
            {selected ? <b>{selectedLabel}</b> : null}
            {paired ? <b className="secondary">{pairedLabel}</b> : null}
            <SpriteFrame pet={pet} row={state.row} frame={frame} size={74} />
            <span>{frame + 1}</span>
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
  state: PetState;
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
            <span>{frame + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

function SpriteStrip({
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

function RunPlanStrip({ pet, state, rowPlan, size }: { pet: Pet; state: PetState; rowPlan: SpriteRowPlan; size: number }) {
  const plan = rowPlan[state.row] || { sourceRow: state.row, flipX: false };
  return (
    <div className="spriteEditorStrip">
      {Array.from({ length: state.frames }, (_, frame) => (
        <SpriteFrame frame={frame} key={frame} pet={pet} row={plan.sourceRow} size={size} flipX={plan.flipX} />
      ))}
    </div>
  );
}

function AnimatedSprite({
  pet,
  state,
  rowPlan,
  alignEdits,
  size,
  fps,
  className = ""
}: {
  pet: Pet;
  state: PetState;
  rowPlan?: SpriteRowPlan;
  alignEdits?: AlignDraftMap;
  size: number;
  fps: number;
  className?: string;
}) {
  const frame = useAnimationFrame(state.frames, fps);
  const plan = rowPlan?.[state.row] || { sourceRow: state.row, flipX: false };
  const alignEdit = alignEditForFrame(alignEdits, state.row, frame);
  return (
    <SpriteFrame
      pet={pet}
      row={plan.sourceRow}
      frame={frame}
      size={size}
      flipX={plan.flipX}
      shiftX={alignEdit?.dx || 0}
      shiftY={alignEdit?.dy || 0}
      rotate={alignEdit?.rotate || 0}
      className={className}
    />
  );
}

function SpriteFrame({
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
    backgroundSize: `${spriteCellWidth * 8 * scale}px ${spriteCellHeight * 9 * scale}px`,
    transform: `translate(${shiftX * scale}px, ${shiftY * scale}px) rotate(${rotate}deg)${flipX ? " scaleX(-1)" : ""}`
  };
  return (
    <div className={`spriteFrameClip ${className}`} style={{ width: `${size}px`, height: `${height}px` }}>
      <div className="spriteFrameImage" style={imageStyle} />
    </div>
  );
}

function PixelCleanCanvas({
  imageData,
  edits,
  zoom,
  brushSize,
  mode,
  onPaint,
  onSample
}: {
  imageData: ImageData;
  edits: PixelPatchMap;
  zoom: number;
  brushSize: number;
  mode: PixelMode;
  onPaint: (x: number, y: number) => void;
  onSample: (x: number, y: number) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = spriteCellWidth * zoom;
    canvas.height = spriteCellHeight * zoom;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    drawCheckerboard(context, canvas.width, canvas.height, zoom * 4);

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = spriteCellWidth;
    sourceCanvas.height = spriteCellHeight;
    const sourceContext = sourceCanvas.getContext("2d");
    if (!sourceContext) return;
    sourceContext.putImageData(renderPixelData(imageData, edits), 0, 0);
    context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

    if (zoom >= 5) {
      context.strokeStyle = "rgba(255, 255, 255, 0.055)";
      context.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += zoom) {
        context.beginPath();
        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, canvas.height);
        context.stroke();
      }
      for (let y = 0; y <= canvas.height; y += zoom) {
        context.beginPath();
        context.moveTo(0, y + 0.5);
        context.lineTo(canvas.width, y + 0.5);
        context.stroke();
      }
    }

    if (hover) {
      const half = Math.floor(brushSize / 2);
      const x = (hover.x - half) * zoom;
      const y = (hover.y - half) * zoom;
      const size = brushSize * zoom;
      context.strokeStyle = mode === "restore" ? "#f5f0dc" : "#d8f25a";
      context.lineWidth = 2;
      context.strokeRect(x + 1, y + 1, size - 2, size - 2);
    }
  }, [brushSize, edits, hover, imageData, mode, zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const bounds = visiblePixelBounds(imageData);
    if (!bounds) return;
    const centerX = ((bounds.minX + bounds.maxX + 1) / 2) * zoom;
    const centerY = ((bounds.minY + bounds.maxY + 1) / 2) * zoom;
    viewport.scrollLeft = Math.max(0, centerX - viewport.clientWidth / 2);
    viewport.scrollTop = Math.max(0, centerY - viewport.clientHeight / 2);
  }, [imageData, zoom]);

  function pointForEvent(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / zoom);
    const y = Math.floor((event.clientY - rect.top) / zoom);
    if (x < 0 || y < 0 || x >= spriteCellWidth || y >= spriteCellHeight) return null;
    return { x, y };
  }

  function applyPointer(event: PointerEvent<HTMLCanvasElement>) {
    const point = pointForEvent(event);
    if (!point) return;
    setHover(point);
    if (mode === "sample") {
      onSample(point.x, point.y);
      return;
    }
    onPaint(point.x, point.y);
  }

  return (
    <div className="spriteEditorPixelCanvasViewport" ref={viewportRef}>
      <canvas
        aria-label="Pixel editor canvas"
        className={`spriteEditorPixelCanvas ${mode}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drawingRef.current = true;
          applyPointer(event);
        }}
        onPointerMove={(event) => {
          const point = pointForEvent(event);
          setHover(point);
          if (drawingRef.current && mode !== "sample") {
            applyPointer(event);
          }
        }}
        onPointerLeave={() => setHover(null)}
        onPointerUp={(event) => {
          drawingRef.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        ref={canvasRef}
      />
    </div>
  );
}

function visiblePixelBounds(imageData: ImageData) {
  let minX = spriteCellWidth;
  let minY = spriteCellHeight;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < spriteCellHeight; y += 1) {
    for (let x = 0; x < spriteCellWidth; x += 1) {
      if (imageData.data[(y * spriteCellWidth + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

function PixelMiniPreview({ imageData, edits }: { imageData: ImageData; edits: PixelPatchMap }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 96;
    canvas.height = 104;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    drawCheckerboard(context, canvas.width, canvas.height, 8);
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = spriteCellWidth;
    sourceCanvas.height = spriteCellHeight;
    const sourceContext = sourceCanvas.getContext("2d");
    if (!sourceContext) return;
    sourceContext.putImageData(renderPixelData(imageData, edits), 0, 0);
    context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  }, [edits, imageData]);
  return <canvas className="spriteEditorMiniCanvas" ref={canvasRef} />;
}

function renderPixelData(imageData: ImageData, edits: PixelPatchMap) {
  const next = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  for (const pixel of Object.values(edits)) {
    const index = (pixel.y * spriteCellWidth + pixel.x) * 4;
    next.data[index] = pixel.r;
    next.data[index + 1] = pixel.g;
    next.data[index + 2] = pixel.b;
    next.data[index + 3] = pixel.a;
  }
  return next;
}

function drawCheckerboard(context: CanvasRenderingContext2D, width: number, height: number, size: number) {
  context.fillStyle = "#161914";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#20251c";
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      if (((x / size) + (y / size)) % 2 === 0) {
        context.fillRect(x, y, size, size);
      }
    }
  }
}

function useSpriteCellImageData(downloadUrl: string, row: number, frame: number) {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setImageData(null);
    setLoading(true);
    setError("");

    async function loadCell() {
      try {
        const spritesheet = await fetchPetPackageSpritesheet(downloadUrl);
        objectUrl = URL.createObjectURL(spritesheet);
        const image = new Image();
        image.decoding = "async";
        image.src = objectUrl;
        await image.decode();
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = spriteCellWidth;
        canvas.height = spriteCellHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Could not read sprite pixels.");
        }
        context.imageSmoothingEnabled = false;
        context.drawImage(
          image,
          frame * spriteCellWidth,
          row * spriteCellHeight,
          spriteCellWidth,
          spriteCellHeight,
          0,
          0,
          spriteCellWidth,
          spriteCellHeight
        );
        setImageData(context.getImageData(0, 0, spriteCellWidth, spriteCellHeight));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load sprite pixels.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCell();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [downloadUrl, frame, row]);

  return { imageData, loading, error };
}

function RangeField({
  label,
  min,
  max,
  step,
  value,
  valueLabel,
  disabled,
  onChange
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  valueLabel: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="spriteEditorRangeField">
      <span>
        {label}
        <strong>{valueLabel}</strong>
      </span>
      <input
        aria-label={label}
        disabled={disabled}
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

function SegmentedControl<TValue extends string>({
  label,
  value,
  values,
  disabled,
  onChange
}: {
  label: string;
  value: TValue;
  values: ReadonlyArray<{ id: TValue; label: string }>;
  disabled: boolean;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="spriteEditorSegmentedField">
      <span>{label}</span>
      <div className="spriteEditorSegmented">
        {values.map((item) => (
          <button
            aria-pressed={value === item.id}
            className={value === item.id ? "active" : ""}
            disabled={disabled}
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PanelTitle({ title, label }: { title: string; label?: string }) {
  return (
    <div className="spriteEditorPanelTitle">
      <h3>{title}</h3>
      {label ? <span>{label}</span> : null}
    </div>
  );
}

function StageHeading({ title, label }: { title: string; label: string }) {
  return (
    <div className="spriteEditorStageHeading">
      <h3>{title}</h3>
      <span>{label}</span>
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

function pixelKey(x: number, y: number) {
  return `${x}:${y}`;
}

function createDefaultAlignEdit(): AlignEdit {
  return { frame: "all", dx: 0, dy: 0, rotate: 0 };
}

function isAlignEditChanged(edit: AlignEdit) {
  return edit.dx !== 0 || edit.dy !== 0 || edit.rotate !== 0;
}

function alignEditForFrame(edits: AlignDraftMap | undefined, row: number, frame: number) {
  const edit = edits?.[row];
  if (!edit || !isAlignEditChanged(edit)) return null;
  return edit.frame === "all" || edit.frame === frame ? edit : null;
}

function updateAlignEdit(
  setAlignEdits: Dispatch<SetStateAction<AlignDraftMap>>,
  row: number,
  patch: Partial<AlignEdit>
) {
  setAlignEdits((current) => {
    const nextEdit = {
      ...createDefaultAlignEdit(),
      ...current[row],
      ...patch
    };
    return {
      ...current,
      [row]: nextEdit
    };
  });
}

function removeAlignEdit(setAlignEdits: Dispatch<SetStateAction<AlignDraftMap>>, row: number) {
  setAlignEdits((current) => {
    const { [row]: _removed, ...rest } = current;
    return rest;
  });
}

function serializeAlignTransforms(edits: AlignDraftMap): SpriteFrameTransform[] {
  return petStates
    .map((state) => ({
      row: state.row,
      ...(edits[state.row] || createDefaultAlignEdit())
    }))
    .filter((transform) => transform.dx !== 0 || transform.dy !== 0 || transform.rotate !== 0);
}

function formatAlignEditLabel(edit: AlignEdit) {
  return `${formatAlignTargetLabel(edit.frame)} ${formatAlignAdjustmentLabel(edit)}`;
}

function formatAlignTargetLabel(frame: SpriteFrameTarget) {
  return frame === "all" ? "all frames" : `frame ${frame + 1}`;
}

function formatAlignOffsetLabel(edit: AlignEdit) {
  return `x ${formatSignedPixels(edit.dx)} / y ${formatSignedPixels(edit.dy)}`;
}

function formatAlignAdjustmentLabel(edit: AlignEdit) {
  const rotateLabel = edit.rotate === 0 ? "" : ` / rotate ${edit.rotate}`;
  return `${formatAlignOffsetLabel(edit)}${rotateLabel}`;
}

function formatMotionCardEditLabel(edit: AlignEdit) {
  const parts: string[] = [];
  if (edit.dx !== 0) parts.push(`x ${formatSignedPixels(edit.dx)}`);
  if (edit.dy !== 0) parts.push(`y ${formatSignedPixels(edit.dy)}`);
  if (edit.rotate !== 0) parts.push(`r ${edit.rotate}`);
  return `${formatAlignTargetLabel(edit.frame)} ${parts.join(" / ")}`;
}

function formatSignedPixels(value: number) {
  if (value > 0) return `+${value}px`;
  if (value < 0) return `${value}px`;
  return "0px";
}

function formatTransformCount(count: number) {
  return count === 1 ? "1 transform" : `${count} transforms`;
}

function draftStorageKey(petId: string) {
  return `${spriteEditorDraftPrefix}${petId}`;
}

function readSpriteEditorDraft(petId: string): SpriteEditorDraft | null {
  try {
    const raw = window.localStorage.getItem(draftStorageKey(petId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SpriteEditorDraft>;
    if (value.version !== 1 || !isEditorToolId(value.activeTool)) return null;
    return {
      version: 1,
      activeTool: value.activeTool,
      directionOperation: isSpriteFixOperation(value.directionOperation) ? value.directionOperation : null,
      rowMap: normalizeDraftRowMap(value.rowMap),
      frameRow: normalizeDraftRow(value.frameRow, 1),
      frameIndex: normalizeNullableFrame(value.frameIndex, normalizeDraftRow(value.frameRow, 1)),
      sourceFrameIndex: normalizeNullableFrame(value.sourceFrameIndex, normalizeDraftRow(value.frameRow, 1)),
      pixelRow: normalizeDraftRow(value.pixelRow, 0),
      pixelFrame: normalizeDraftFrame(value.pixelFrame, normalizeDraftRow(value.pixelRow, 0), 0),
      pixelMode: isPixelMode(value.pixelMode) ? value.pixelMode : "erase",
      pixelZoom: clampDraftNumber(value.pixelZoom, 2, 10, 5),
      pixelBrushSize: clampDraftNumber(value.pixelBrushSize, 1, 15, 3),
      pixelTolerance: clampDraftNumber(value.pixelTolerance, 0, 96, 20),
      pixelEdits: normalizePixelEdits(value.pixelEdits),
      alignRow: normalizeDraftRow(value.alignRow, 1),
      alignEdits: normalizeAlignEdits(value.alignEdits)
    };
  } catch {
    return null;
  }
}

function writeSpriteEditorDraft(petId: string, draft: SpriteEditorDraft) {
  window.localStorage.setItem(draftStorageKey(petId), JSON.stringify(draft));
}

function clearSpriteEditorDraft(petId: string) {
  window.localStorage.removeItem(draftStorageKey(petId));
}

function isEditorToolId(value: unknown): value is EditorToolId {
  return editorTools.some((tool) => tool.id === value);
}

function isSpriteFixOperation(value: unknown): value is SpriteFixOperation {
  return directionOptions.some((option) => option.id === value);
}

function isPixelMode(value: unknown): value is PixelMode {
  return pixelModes.some((mode) => mode.id === value);
}

function normalizeDraftRow(value: unknown, fallback: number) {
  return clampDraftNumber(value, 0, petStates.length - 1, fallback);
}

function normalizeDraftFrame(value: unknown, row: number, fallback: number) {
  return clampDraftNumber(value, 0, stateForRow(row).frames - 1, fallback);
}

function normalizeNullableFrame(value: unknown, row: number) {
  return value === null || value === undefined ? null : normalizeDraftFrame(value, row, 0);
}

function normalizeDraftFrameTarget(value: unknown, row: number): SpriteFrameTarget {
  return value === "all" ? "all" : normalizeDraftFrame(value, row, 0);
}

function normalizeDraftRowMap(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(petStates.map((state) => [state.row, normalizeDraftRow(record[state.row], state.row)]));
}

function normalizePixelEdits(value: unknown): PixelPatchMap {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const next: PixelPatchMap = {};
  for (const [key, rawPixel] of Object.entries(record)) {
    if (!rawPixel || typeof rawPixel !== "object") continue;
    const pixel = rawPixel as Partial<SpritePixelPatch>;
    const x = clampDraftNumber(pixel.x, 0, spriteCellWidth - 1, 0);
    const y = clampDraftNumber(pixel.y, 0, spriteCellHeight - 1, 0);
    next[pixelKey(x, y)] = {
      x,
      y,
      r: clampDraftNumber(pixel.r, 0, 255, 0),
      g: clampDraftNumber(pixel.g, 0, 255, 0),
      b: clampDraftNumber(pixel.b, 0, 255, 0),
      a: clampDraftNumber(pixel.a, 0, 255, 0)
    };
  }
  return next;
}

function normalizeAlignEdits(value: unknown): AlignDraftMap {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const next: AlignDraftMap = {};
  for (const state of petStates) {
    const rawEdit = record[state.row];
    if (!rawEdit || typeof rawEdit !== "object") continue;
    const edit = rawEdit as Partial<AlignEdit>;
    const dx = clampDraftNumber(edit.dx, -48, 48, 0);
    const dy = clampDraftNumber(edit.dy, -48, 48, 0);
    const rotate = normalizeDraftRotation(edit.rotate);
    if (dx === 0 && dy === 0 && rotate === 0) continue;
    next[state.row] = {
      frame: normalizeDraftFrameTarget(edit.frame, state.row),
      dx,
      dy,
      rotate
    };
  }
  return next;
}

function normalizeDraftRotation(value: unknown): AlignRotation {
  const number = clampDraftNumber(value, 0, 270, 0);
  return number === 90 || number === 180 || number === 270 ? number : 0;
}

function clampDraftNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Math.min(Math.max(Math.round(Number.isFinite(number) ? number : fallback), min), max);
}

function saveLabelForTool(tool: EditorToolId, directionLabel: string) {
  if (tool === "repair") return directionLabel;
  if (tool === "rows") return "Save row map";
  if (tool === "frames") return "Save frame repair";
  if (tool === "clean") return "Save pixel edits";
  if (tool === "align") return "Save transform";
  return "No package edit";
}

function saveNoteForTool(
  tool: EditorToolId,
  directionSelected: boolean,
  rowMapChanged: boolean,
  frameRepairReady: boolean,
  pixelPatchCount: number,
  alignMoved: boolean
) {
  if (tool === "repair" && !directionSelected) return "Choose one direction repair before saving.";
  if (tool === "preview") return "";
  if (tool === "rows" && !rowMapChanged) return "Change at least one row mapping before saving.";
  if (tool === "frames" && !frameRepairReady) return "Choose a bad frame and a different replacement frame before saving.";
  if (tool === "clean" && pixelPatchCount === 0) return "Erase, restore, or sample pixels before saving.";
  if (tool === "align" && !alignMoved) return "Move or rotate at least one row or frame before saving.";
  return "";
}
