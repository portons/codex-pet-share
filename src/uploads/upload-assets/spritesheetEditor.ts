import {
  allPetAnimationRows,
  petEditorAnimationRows,
  spriteCellWidth,
  spriteCellHeight
} from "../../domain/config";
import { encodeCanvasAsLosslessWebp } from "./webpEncode";

export type SpriteFixOperation =
  | "swap-running-rows"
  | "mirror-right-to-left"
  | "mirror-left-to-right"
  | "swap-look-rows"
  | "mirror-look-right-to-left"
  | "mirror-look-left-to-right";
export type SpriteFrameTarget = number | "all";
export type SpritePixelPatch = { x: number; y: number; r: number; g: number; b: number; a: number };
export type SpriteFrameTransform = { row: number; frame: SpriteFrameTarget; dx: number; dy: number; rotate: number };

export type PetSpriteEditorOperation =
  | { kind: SpriteFixOperation }
  | { kind: "remap-rows"; rowMap: Record<number, number> }
  | { kind: "replace-frame"; row: number; frame: number; sourceFrame: number }
  | { kind: "transform-frames"; transforms: SpriteFrameTransform[] }
  | { kind: "pixel-patch"; row: number; frame: number; pixels: SpritePixelPatch[] };

export async function fixRunningDirectionRows(spritesheet: File, operation: SpriteFixOperation) {
  return editPetSpritesheet(spritesheet, { kind: operation });
}

export async function editPetSpritesheet(spritesheet: File, operation: PetSpriteEditorOperation) {
  const imageUrl = URL.createObjectURL(spritesheet);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not repair spritesheet.");
    }

    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0);

    if (
      operation.kind === "swap-running-rows"
      || operation.kind === "mirror-right-to-left"
      || operation.kind === "mirror-left-to-right"
      || operation.kind === "swap-look-rows"
      || operation.kind === "mirror-look-right-to-left"
      || operation.kind === "mirror-look-left-to-right"
    ) {
      applyDirectionOperation(canvas, context, operation.kind);
    } else if (operation.kind === "remap-rows") {
      applyRowRemap(canvas, context, operation.rowMap);
    } else if (operation.kind === "replace-frame") {
      applyFrameReplacement(canvas, context, operation.row, operation.frame, operation.sourceFrame);
    } else if (operation.kind === "transform-frames") {
      applyFrameTransforms(canvas, context, operation.transforms);
    } else if (operation.kind === "pixel-patch") {
      applyPixelPatch(context, operation);
    }

    return encodeCanvasAsLosslessWebp(canvas, "spritesheet.webp");
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function applyDirectionOperation(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  operation: SpriteFixOperation
) {
  const isLookOperation = operation === "swap-look-rows"
    || operation === "mirror-look-right-to-left"
    || operation === "mirror-look-left-to-right";
  const rightRow = isLookOperation ? 9 : 1;
  const leftRow = isLookOperation ? 10 : 2;

  if (operation === "swap-running-rows" || operation === "swap-look-rows") {
    const right = context.getImageData(0, rightRow * spriteCellHeight, canvas.width, spriteCellHeight);
    const left = context.getImageData(0, leftRow * spriteCellHeight, canvas.width, spriteCellHeight);
    context.putImageData(left, 0, rightRow * spriteCellHeight);
    context.putImageData(right, 0, leftRow * spriteCellHeight);
    return;
  }

  const mirrorsRightIntoLeft = operation === "mirror-right-to-left"
    || operation === "mirror-look-right-to-left";
  const sourceRow = mirrorsRightIntoLeft ? rightRow : leftRow;
  const targetRow = mirrorsRightIntoLeft ? leftRow : rightRow;
  const sourceCanvas = snapshotCanvas(canvas);
  const firstTargetFrame = isLookOperation ? 1 : 0;

  for (let targetFrame = firstTargetFrame; targetFrame < 8; targetFrame += 1) {
    const sourceFrame = isLookOperation ? 8 - targetFrame : targetFrame;
    copyMirroredCell(sourceCanvas, context, sourceRow, sourceFrame, targetRow, targetFrame);
  }
}

function copyMirroredCell(
  sourceCanvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  sourceRow: number,
  sourceFrame: number,
  targetRow: number,
  targetFrame: number
) {
  const targetX = targetFrame * spriteCellWidth;
  const targetY = targetRow * spriteCellHeight;
  context.clearRect(targetX, targetY, spriteCellWidth, spriteCellHeight);
  context.save();
  context.translate(targetX + spriteCellWidth, targetY);
  context.scale(-1, 1);
  context.drawImage(
    sourceCanvas,
    sourceFrame * spriteCellWidth,
    sourceRow * spriteCellHeight,
    spriteCellWidth,
    spriteCellHeight,
    0,
    0,
    spriteCellWidth,
    spriteCellHeight
  );
  context.restore();
}

function applyRowRemap(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  rowMap: Record<number, number>
) {
  const sourceCanvas = snapshotCanvas(canvas);
  const rowCount = spriteRowCount(canvas);
  for (let targetRow = 0; targetRow < rowCount; targetRow += 1) {
    const sourceRow = clampInteger(rowMap[targetRow] ?? targetRow, 0, rowCount - 1);
    context.clearRect(0, targetRow * spriteCellHeight, canvas.width, spriteCellHeight);
    context.drawImage(
      sourceCanvas,
      0,
      sourceRow * spriteCellHeight,
      canvas.width,
      spriteCellHeight,
      0,
      targetRow * spriteCellHeight,
      canvas.width,
      spriteCellHeight
    );
  }
}

function applyFrameReplacement(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  row: number,
  frame: number,
  sourceFrame: number
) {
  const sourceCanvas = snapshotCanvas(canvas);
  const normalizedRow = clampInteger(row, 0, spriteRowCount(canvas) - 1);
  const frameCount = frameCountForRow(normalizedRow, canvas);
  const normalizedFrame = clampInteger(frame, 0, frameCount - 1);
  const normalizedSourceFrame = clampInteger(sourceFrame, 0, frameCount - 1);
  copyCell(sourceCanvas, context, normalizedRow, normalizedSourceFrame, normalizedRow, normalizedFrame);
}

function applyFrameTransforms(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  transforms: SpriteFrameTransform[]
) {
  const sourceCanvas = snapshotCanvas(canvas);
  const rowCount = spriteRowCount(canvas);
  for (const transform of transforms) {
    const row = clampInteger(transform.row, 0, rowCount - 1);
    const dx = clampInteger(transform.dx, -48, 48);
    const dy = clampInteger(transform.dy, -48, 48);
    const rotate = normalizeRotation(transform.rotate);
    if (dx === 0 && dy === 0 && rotate === 0) continue;
    for (const frame of framesForTarget(row, transform.frame, canvas)) {
      const x = frame * spriteCellWidth;
      const y = row * spriteCellHeight;
      context.save();
      context.beginPath();
      context.rect(x, y, spriteCellWidth, spriteCellHeight);
      context.clip();
      context.clearRect(x, y, spriteCellWidth, spriteCellHeight);
      context.translate(x + spriteCellWidth / 2 + dx, y + spriteCellHeight / 2 + dy);
      context.rotate((rotate * Math.PI) / 180);
      context.drawImage(
        sourceCanvas,
        x,
        y,
        spriteCellWidth,
        spriteCellHeight,
        -spriteCellWidth / 2,
        -spriteCellHeight / 2,
        spriteCellWidth,
        spriteCellHeight
      );
      context.restore();
    }
  }
}

function applyPixelPatch(
  context: CanvasRenderingContext2D,
  operation: Extract<PetSpriteEditorOperation, { kind: "pixel-patch" }>
) {
  const canvas = context.canvas;
  const row = clampInteger(operation.row, 0, spriteRowCount(canvas) - 1);
  const frame = clampInteger(operation.frame, 0, frameCountForRow(row, canvas) - 1);
  const cellX = frame * spriteCellWidth;
  const cellY = row * spriteCellHeight;
  const imageData = context.getImageData(cellX, cellY, spriteCellWidth, spriteCellHeight);

  for (const pixel of operation.pixels) {
    const x = clampInteger(pixel.x, 0, spriteCellWidth - 1);
    const y = clampInteger(pixel.y, 0, spriteCellHeight - 1);
    const index = (y * spriteCellWidth + x) * 4;
    imageData.data[index] = clampInteger(pixel.r, 0, 255);
    imageData.data[index + 1] = clampInteger(pixel.g, 0, 255);
    imageData.data[index + 2] = clampInteger(pixel.b, 0, 255);
    imageData.data[index + 3] = clampInteger(pixel.a, 0, 255);
  }

  context.putImageData(imageData, cellX, cellY);
}

function copyCell(
  sourceCanvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  sourceRow: number,
  sourceFrame: number,
  targetRow: number,
  targetFrame: number
) {
  context.clearRect(targetFrame * spriteCellWidth, targetRow * spriteCellHeight, spriteCellWidth, spriteCellHeight);
  context.drawImage(
    sourceCanvas,
    sourceFrame * spriteCellWidth,
    sourceRow * spriteCellHeight,
    spriteCellWidth,
    spriteCellHeight,
    targetFrame * spriteCellWidth,
    targetRow * spriteCellHeight,
    spriteCellWidth,
    spriteCellHeight
  );
}

function snapshotCanvas(canvas: HTMLCanvasElement) {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = canvas.width;
  sourceCanvas.height = canvas.height;
  const sourceContext = sourceCanvas.getContext("2d");
  if (!sourceContext) {
    throw new Error("Could not read spritesheet.");
  }
  sourceContext.imageSmoothingEnabled = false;
  sourceContext.drawImage(canvas, 0, 0);
  return sourceCanvas;
}

function framesForTarget(row: number, target: SpriteFrameTarget, canvas: HTMLCanvasElement) {
  const frameCount = frameCountForRow(row, canvas);
  return target === "all"
    ? Array.from({ length: frameCount }, (_, frame) => frame)
    : [clampInteger(target, 0, frameCount - 1)];
}

function frameCountForRow(row: number, canvas: HTMLCanvasElement) {
  const spriteVersionNumber = spriteRowCount(canvas) === 11 ? 2 : 1;
  return petEditorAnimationRows(spriteVersionNumber).find((state) => state.row === row)?.frames ?? 8;
}

function spriteRowCount(canvas: HTMLCanvasElement) {
  return clampInteger(canvas.height / spriteCellHeight, 1, allPetAnimationRows.length);
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(Number.isFinite(value) ? value : min), min), max);
}

function normalizeRotation(value: number) {
  const normalized = ((clampInteger(value, -270, 270) % 360) + 360) % 360;
  return normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0;
}
