import { petEditorAnimationRows, spriteCellHeight, spriteCellWidth } from "../../domain/config";
import type { Pet } from "../../domain/types";
import type { SpriteFrameTarget, SpritePixelPatch } from "../../uploads/uploadAssets";
import { isEditorToolId, isPixelMode, isSpriteFixOperation } from "./editorConfig";
import { pixelKey } from "./pixelData";
import { directionPairForOperation, stateForRow } from "./rowPlans";
import type { AlignDraftMap, AlignEdit, AlignRotation, PixelPatchMap, SpriteEditorDraft } from "./types";

const spriteEditorDraftPrefix = "codex-pet-share.sprite-editor-draft.";

function draftStorageKey(petId: string) {
  return `${spriteEditorDraftPrefix}${petId}`;
}

export function readSpriteEditorDraft(petId: string, spriteVersionNumber: Pet["spriteVersionNumber"]): SpriteEditorDraft | null {
  try {
    const raw = window.localStorage.getItem(draftStorageKey(petId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SpriteEditorDraft>;
    if (value.version !== 1 || !isEditorToolId(value.activeTool)) return null;
    const directionOperation = isSpriteFixOperation(value.directionOperation)
      && (spriteVersionNumber === 2 || directionPairForOperation(value.directionOperation) === "run")
      ? value.directionOperation
      : null;
    return {
      version: 1,
      activeTool: value.activeTool,
      directionOperation,
      rowMap: normalizeDraftRowMap(value.rowMap, spriteVersionNumber),
      frameRow: normalizeDraftRow(value.frameRow, 1, spriteVersionNumber),
      frameIndex: normalizeNullableFrame(
        value.frameIndex,
        normalizeDraftRow(value.frameRow, 1, spriteVersionNumber),
        spriteVersionNumber
      ),
      sourceFrameIndex: normalizeNullableFrame(
        value.sourceFrameIndex,
        normalizeDraftRow(value.frameRow, 1, spriteVersionNumber),
        spriteVersionNumber
      ),
      pixelRow: normalizeDraftRow(value.pixelRow, 0, spriteVersionNumber),
      pixelFrame: normalizeDraftFrame(
        value.pixelFrame,
        normalizeDraftRow(value.pixelRow, 0, spriteVersionNumber),
        0,
        spriteVersionNumber
      ),
      pixelMode: isPixelMode(value.pixelMode) ? value.pixelMode : "erase",
      pixelZoom: clampDraftNumber(value.pixelZoom, 2, 10, 5),
      pixelBrushSize: clampDraftNumber(value.pixelBrushSize, 1, 15, 3),
      pixelTolerance: clampDraftNumber(value.pixelTolerance, 0, 96, 20),
      pixelEdits: normalizePixelEdits(value.pixelEdits),
      alignRow: normalizeDraftRow(value.alignRow, 1, spriteVersionNumber),
      alignEdits: normalizeAlignEdits(value.alignEdits, spriteVersionNumber)
    };
  } catch {
    return null;
  }
}

export function writeSpriteEditorDraft(petId: string, draft: SpriteEditorDraft) {
  window.localStorage.setItem(draftStorageKey(petId), JSON.stringify(draft));
}

export function clearSpriteEditorDraft(petId: string) {
  window.localStorage.removeItem(draftStorageKey(petId));
}

function normalizeDraftRow(value: unknown, fallback: number, spriteVersionNumber: Pet["spriteVersionNumber"]) {
  return clampDraftNumber(value, 0, petEditorAnimationRows(spriteVersionNumber).length - 1, fallback);
}

function normalizeDraftFrame(
  value: unknown,
  row: number,
  fallback: number,
  spriteVersionNumber: Pet["spriteVersionNumber"]
) {
  return clampDraftNumber(value, 0, stateForRow(row, spriteVersionNumber).frames - 1, fallback);
}

function normalizeNullableFrame(value: unknown, row: number, spriteVersionNumber: Pet["spriteVersionNumber"]) {
  return value === null || value === undefined ? null : normalizeDraftFrame(value, row, 0, spriteVersionNumber);
}

function normalizeDraftFrameTarget(
  value: unknown,
  row: number,
  spriteVersionNumber: Pet["spriteVersionNumber"]
): SpriteFrameTarget {
  return value === "all" ? "all" : normalizeDraftFrame(value, row, 0, spriteVersionNumber);
}

function normalizeDraftRowMap(value: unknown, spriteVersionNumber: Pet["spriteVersionNumber"]) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(petEditorAnimationRows(spriteVersionNumber).map((state) => [
    state.row,
    normalizeDraftRow(record[state.row], state.row, spriteVersionNumber)
  ]));
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

function normalizeAlignEdits(value: unknown, spriteVersionNumber: Pet["spriteVersionNumber"]): AlignDraftMap {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const next: AlignDraftMap = {};
  for (const state of petEditorAnimationRows(spriteVersionNumber)) {
    const rawEdit = record[state.row];
    if (!rawEdit || typeof rawEdit !== "object") continue;
    const edit = rawEdit as Partial<AlignEdit>;
    const dx = clampDraftNumber(edit.dx, -48, 48, 0);
    const dy = clampDraftNumber(edit.dy, -48, 48, 0);
    const rotate = normalizeDraftRotation(edit.rotate);
    if (dx === 0 && dy === 0 && rotate === 0) continue;
    next[state.row] = {
      frame: normalizeDraftFrameTarget(edit.frame, state.row, spriteVersionNumber),
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
