import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { petEditorAnimationRows } from "../../domain/config";
import type { Pet } from "../../domain/types";
import type { PetSpriteEditorOperation, SpriteFixOperation } from "../../uploads/uploadAssets";
import { createDefaultAlignEdit, serializeAlignTransforms } from "./alignEdits";
import { clearSpriteEditorDraft, readSpriteEditorDraft, writeSpriteEditorDraft } from "./draftStorage";
import { directionOptions } from "./editorConfig";
import { currentPlanForPair, directionPairForOperation, rowPlanForOperation, stateForRow } from "./rowPlans";
import type { AlignDraftMap, DirectionPairId, EditorToolId, PixelMode, PixelPatchMap } from "./types";

export function useSpriteFixerEditor({
  pet,
  busy,
  onSubmit,
  onClose
}: {
  pet: Pet;
  busy: boolean;
  onSubmit: (event: FormEvent, operation: PetSpriteEditorOperation) => boolean | Promise<boolean>;
  onClose: () => void;
}) {
  const editorStates = useMemo(() => petEditorAnimationRows(pet.spriteVersionNumber), [pet.spriteVersionNumber]);
  const initialDraft = useMemo(
    () => readSpriteEditorDraft(pet.id, pet.spriteVersionNumber),
    [pet.id, pet.spriteVersionNumber]
  );
  const [activeTool, setActiveTool] = useState<EditorToolId>(initialDraft?.activeTool || "repair");
  const [directionOperation, setDirectionOperation] = useState<SpriteFixOperation | null>(initialDraft?.directionOperation || null);
  const [directionPair, setDirectionPair] = useState<DirectionPairId>(
    directionPairForOperation(initialDraft?.directionOperation)
  );
  const [rowMap, setRowMap] = useState<Record<number, number>>(() =>
    initialDraft?.rowMap || Object.fromEntries(editorStates.map((state) => [state.row, state.row]))
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

  const currentDirectionPlan = useMemo(() => currentPlanForPair(directionPair), [directionPair]);
  const afterPlan = useMemo(
    () => directionOperation ? rowPlanForOperation(directionOperation) : currentDirectionPlan,
    [currentDirectionPlan, directionOperation]
  );
  const selectedDirection = directionOptions.find((option) => option.id === directionOperation) || null;
  const selectedFrameState = stateForRow(frameRow, pet.spriteVersionNumber);
  const selectedAlignState = stateForRow(alignRow, pet.spriteVersionNumber);
  const selectedAlignEdit = alignEdits[alignRow] || createDefaultAlignEdit();
  const selectedPreviewState = stateForRow(previewRow, pet.spriteVersionNumber);
  const rowMapChanged = editorStates.some((state) => (rowMap[state.row] ?? state.row) !== state.row);
  const rowMapChangeCount = editorStates.filter((state) => (rowMap[state.row] ?? state.row) !== state.row).length;
  const pixelPatchCount = Object.keys(pixelEdits).length;
  const alignTransforms = useMemo(() => serializeAlignTransforms(alignEdits, editorStates), [alignEdits, editorStates]);
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
    setPixelFrame((current) => Math.min(current, stateForRow(row, pet.spriteVersionNumber).frames - 1));
    setPixelEdits({});
  }

  function changePixelFrame(frame: number) {
    setPixelFrame(frame);
    setPixelEdits({});
  }

  function changeDirectionPair(pair: DirectionPairId) {
    setDirectionPair(pair);
    setDirectionOperation(null);
  }

  return {
    editorStates,
    workbenchRef,
    inspectorRef,
    activeTool,
    setActiveTool,
    directionPair,
    changeDirectionPair,
    directionOperation,
    setDirectionOperation,
    selectedDirection,
    currentDirectionPlan,
    afterPlan,
    rowMap,
    setRowMap,
    updateRowMap,
    rowMapTargetRow,
    setRowMapTargetRow,
    rowMapChanged,
    rowMapChangeCount,
    selectedFrameState,
    frameIndex,
    setFrameIndex,
    sourceFrameIndex,
    setSourceFrameIndex,
    changeFrameRow,
    pixelRow,
    pixelFrame,
    pixelMode,
    setPixelMode,
    pixelZoom,
    setPixelZoom,
    pixelBrushSize,
    setPixelBrushSize,
    pixelTolerance,
    setPixelTolerance,
    pixelEdits,
    setPixelEdits,
    pixelPatchCount,
    changePixelRow,
    changePixelFrame,
    alignRow,
    setAlignRow,
    alignEdits,
    setAlignEdits,
    selectedAlignState,
    selectedAlignEdit,
    alignTransforms,
    selectedPreviewState,
    setPreviewRow,
    draftWasRestored,
    hasUnsavedDraft,
    confirmCloseOpen,
    setConfirmCloseOpen,
    isPreviewOnly,
    canSave,
    saveLabel,
    saveNote,
    submitEditor,
    requestClose,
    closeAndKeepDraft,
    discardDraftAndClose
  };
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
