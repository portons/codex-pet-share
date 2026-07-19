import type { Dispatch, SetStateAction } from "react";
import type { PetAnimationRow } from "../../domain/config";
import type { SpriteFrameTarget, SpriteFrameTransform } from "../../uploads/uploadAssets";
import type { AlignDraftMap, AlignEdit } from "./types";

export function createDefaultAlignEdit(): AlignEdit {
  return { frame: "all", dx: 0, dy: 0, rotate: 0 };
}

export function isAlignEditChanged(edit: AlignEdit) {
  return edit.dx !== 0 || edit.dy !== 0 || edit.rotate !== 0;
}

export function alignEditForFrame(edits: AlignDraftMap | undefined, row: number, frame: number) {
  const edit = edits?.[row];
  if (!edit || !isAlignEditChanged(edit)) return null;
  return edit.frame === "all" || edit.frame === frame ? edit : null;
}

export function updateAlignEdit(
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

export function removeAlignEdit(setAlignEdits: Dispatch<SetStateAction<AlignDraftMap>>, row: number) {
  setAlignEdits((current) => {
    const { [row]: _removed, ...rest } = current;
    return rest;
  });
}

export function serializeAlignTransforms(edits: AlignDraftMap, states: readonly PetAnimationRow[]): SpriteFrameTransform[] {
  return states
    .map((state) => ({
      row: state.row,
      ...(edits[state.row] || createDefaultAlignEdit())
    }))
    .filter((transform) => transform.dx !== 0 || transform.dy !== 0 || transform.rotate !== 0);
}

export function formatAlignEditLabel(edit: AlignEdit) {
  return `${formatAlignTargetLabel(edit.frame)} ${formatAlignAdjustmentLabel(edit)}`;
}

export function formatAlignTargetLabel(frame: SpriteFrameTarget) {
  return frame === "all" ? "all frames" : `frame ${frame + 1}`;
}

function formatAlignOffsetLabel(edit: AlignEdit) {
  return `x ${formatSignedPixels(edit.dx)} / y ${formatSignedPixels(edit.dy)}`;
}

export function formatAlignAdjustmentLabel(edit: AlignEdit) {
  const rotateLabel = edit.rotate === 0 ? "" : ` / rotate ${edit.rotate}`;
  return `${formatAlignOffsetLabel(edit)}${rotateLabel}`;
}

export function formatMotionCardEditLabel(edit: AlignEdit) {
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

export function formatTransformCount(count: number) {
  return count === 1 ? "1 transform" : `${count} transforms`;
}
