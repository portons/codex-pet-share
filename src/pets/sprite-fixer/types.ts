import type { SpriteFixOperation, SpriteFrameTarget, SpritePixelPatch } from "../../uploads/uploadAssets";

export type EditorToolId = "repair" | "rows" | "frames" | "clean" | "align" | "preview";
export type DirectionPairId = "run" | "look";
export type SpriteCellPlan = { sourceRow: number; sourceFrame: number; flipX: boolean };
export type SpriteRowPlan = Record<number, readonly SpriteCellPlan[]>;
export type PixelMode = "erase" | "restore" | "sample";
export type AlignRotation = 0 | 90 | 180 | 270;
export type PixelPatchMap = Record<string, SpritePixelPatch>;
export type AlignEdit = { frame: SpriteFrameTarget; dx: number; dy: number; rotate: AlignRotation };
export type AlignDraftMap = Record<number, AlignEdit>;
export type SpriteEditorDraft = {
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
