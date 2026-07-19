import type { IconName } from "../../ui/Icon";
import type { SpriteFixOperation } from "../../uploads/uploadAssets";
import type { AlignRotation, DirectionPairId, EditorToolId, PixelMode } from "./types";

export const editorTools = [
  { id: "repair", label: "Direction", icon: "swap", kicker: "run rows" },
  { id: "rows", label: "Rows", icon: "sheet", kicker: "state map" },
  { id: "frames", label: "Frames", icon: "copy", kicker: "repair" },
  { id: "clean", label: "Clean", icon: "sparkle", kicker: "pixels" },
  { id: "align", label: "Transform", icon: "move", kicker: "row/frame" },
  { id: "preview", label: "Preview", icon: "play", kicker: "runtime" }
] as const satisfies Array<{ id: EditorToolId; label: string; icon: IconName; kicker: string }>;

export const directionPairOptions = [
  { id: "run", label: "Run" },
  { id: "look", label: "Look around" }
] as const satisfies Array<{ id: DirectionPairId; label: string }>;

export const directionPairs = {
  run: {
    title: "Run direction repair",
    rightRow: 1,
    leftRow: 2,
    afterNote: "left row runs left, right row runs right"
  },
  look: {
    title: "Look-around direction repair",
    rightRow: 9,
    leftRow: 10,
    afterNote: "look cells match their labeled directions"
  }
} as const satisfies Record<DirectionPairId, {
  title: string;
  rightRow: number;
  leftRow: number;
  afterNote: string;
}>;

export const directionOptions = [
  {
    id: "swap-running-rows",
    pair: "run",
    label: "Swap run rows",
    detail: "The uploaded Run left and Run right rows are reversed.",
    action: "Save swapped rows"
  },
  {
    id: "mirror-right-to-left",
    pair: "run",
    label: "Mirror right into left",
    detail: "Run right is correct. Rebuild Run left from that row.",
    action: "Save mirrored left"
  },
  {
    id: "mirror-left-to-right",
    pair: "run",
    label: "Mirror left into right",
    detail: "Run left is correct. Rebuild Run right from that row.",
    action: "Save mirrored right"
  },
  {
    id: "swap-look-rows",
    pair: "look",
    label: "Swap look rows",
    detail: "The uploaded right-side and left-side look rows are reversed.",
    action: "Save swapped look rows"
  },
  {
    id: "mirror-look-right-to-left",
    pair: "look",
    label: "Mirror right looks into left",
    detail: "Keep Down and rebuild the other seven left-side directions from the right-side row.",
    action: "Save mirrored look-left"
  },
  {
    id: "mirror-look-left-to-right",
    pair: "look",
    label: "Mirror left looks into right",
    detail: "Keep Up and rebuild the other seven right-side directions from the left-side row.",
    action: "Save mirrored look-right"
  }
] as const satisfies Array<{
  id: SpriteFixOperation;
  pair: DirectionPairId;
  label: string;
  detail: string;
  action: string;
}>;

export const pixelModes = [
  { id: "erase", label: "Erase" },
  { id: "restore", label: "Restore" },
  { id: "sample", label: "Sample" }
] as const satisfies Array<{ id: PixelMode; label: string }>;

export const rotationOptions = [
  { id: "0", label: "0" },
  { id: "90", label: "90" },
  { id: "180", label: "180" },
  { id: "270", label: "270" }
] as const satisfies Array<{ id: `${AlignRotation}`; label: string }>;

export function isEditorToolId(value: unknown): value is EditorToolId {
  return editorTools.some((tool) => tool.id === value);
}

export function isSpriteFixOperation(value: unknown): value is SpriteFixOperation {
  return directionOptions.some((option) => option.id === value);
}

export function isPixelMode(value: unknown): value is PixelMode {
  return pixelModes.some((mode) => mode.id === value);
}
