import { APP_HANDLE, APP_NAME } from "../branding/brand";
import webpEncWasmUrl from "@jsquash/webp/codec/enc/webp_enc.wasm?url";
import webpEncSimdWasmUrl from "@jsquash/webp/codec/enc/webp_enc_simd.wasm?url";
import {
  isEditablePetKind,
  petStates,
  spriteCellWidth,
  previewFrameCount,
  spriteCellHeight
} from "../domain/config";
import type { EditablePetKind, UploadManifest } from "../domain/types";

export type SpriteFixOperation = "swap-running-rows" | "mirror-right-to-left" | "mirror-left-to-right";
export type SpriteFrameTarget = number | "all";
export type SpritePixelPatch = { x: number; y: number; r: number; g: number; b: number; a: number };
export type SpriteFrameTransform = { row: number; frame: SpriteFrameTarget; dx: number; dy: number; rotate: number };

export type PetSpriteEditorOperation =
  | { kind: SpriteFixOperation }
  | { kind: "remap-rows"; rowMap: Record<number, number> }
  | { kind: "replace-frame"; row: number; frame: number; sourceFrame: number }
  | { kind: "transform-frames"; transforms: SpriteFrameTransform[] }
  | { kind: "pixel-patch"; row: number; frame: number; pixels: SpritePixelPatch[] };

let webpEncodePromise: Promise<typeof import("@jsquash/webp/encode").default> | null = null;

export async function readUploadManifest(file: File): Promise<UploadManifest> {
  let value: Partial<UploadManifest>;
  try {
    value = JSON.parse(await file.text()) as Partial<UploadManifest>;
  } catch {
    throw new Error("pet.json must be valid JSON");
  }
  return {
    id: String(value.id || ""),
    displayName: String(value.displayName || ""),
    description: String(value.description || ""),
    spritesheetPath: String(value.spritesheetPath || ""),
    kind: isEditablePetKind(String(value.kind || "")) ? String(value.kind) as EditablePetKind : undefined
  };
}

export function normalizePetSlug(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function normalizeUploadManifest(manifest: UploadManifest): UploadManifest {
  const id = normalizePetSlug(manifest.id);
  if (!id) {
    throw new Error("pet.json id must contain letters or numbers.");
  }
  return {
    ...manifest,
    id
  };
}

export function uploadManifestFile(manifest: UploadManifest) {
  return new File([JSON.stringify(manifest, null, 2) + "\n"], "pet.json", { type: "application/json" });
}

export async function generateShareImage(manifest: UploadManifest, spritesheet: File) {
  const imageUrl = URL.createObjectURL(spritesheet);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create share image.");
    }

    context.fillStyle = "#f5f0dc";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#e5dec6";
    for (let y = 0; y < canvas.height; y += 32) {
      for (let x = 0; x < canvas.width; x += 32) {
        if ((x + y) % 64 === 0) {
          context.fillRect(x, y, 32, 32);
        }
      }
    }

    context.fillStyle = "#10100f";
    context.font = "700 34px Inter Tight, Arial, sans-serif";
    context.fillText(APP_NAME, 72, 96);
    context.font = "800 82px Inter Tight, Arial, sans-serif";
    wrapCanvasText(context, manifest.displayName, 72, 214, 520, 92, 2);
    context.fillStyle = "#5f5a4f";
    context.font = "500 30px Inter Tight, Arial, sans-serif";
    wrapCanvasText(context, manifest.description, 74, 392, 520, 42, 2);

    context.fillStyle = "#d8f25a";
    context.fillRect(72, 498, 252, 64);
    context.strokeStyle = "#10100f";
    context.lineWidth = 3;
    context.strokeRect(72, 498, 252, 64);
    context.fillStyle = "#10100f";
    context.font = "800 24px Inter Tight, Arial, sans-serif";
    context.fillText(APP_HANDLE, 96, 539);

    context.imageSmoothingEnabled = false;
    context.save();
    context.shadowColor = "rgba(16, 16, 15, 0.22)";
    context.shadowBlur = 24;
    context.shadowOffsetY = 22;
    context.drawImage(image, 0, 0, 192, 208, 690, 70, 384, 416);
    context.restore();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      throw new Error("Could not create share image.");
    }
    return new File([blob], "share.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function generatePreviewImage(spritesheet: File) {
  const imageUrl = URL.createObjectURL(spritesheet);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = previewFrameCount * 96;
    canvas.height = 104;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create preview image.");
    }

    context.imageSmoothingEnabled = false;
    let frameIndex = 0;
    for (const state of petStates) {
      for (let frame = 0; frame < state.frames; frame += 1) {
        context.drawImage(
          image,
          frame * 192,
          state.row * 208,
          192,
          208,
          frameIndex * 96,
          0,
          96,
          104
        );
        frameIndex += 1;
      }
    }

    return encodeCanvasAsWebp(canvas, "preview.webp", 78);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function generatePosterImage(spritesheet: File) {
  const imageUrl = URL.createObjectURL(spritesheet);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 208;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create poster image.");
    }

    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, 192, 208, 0, 0, 192, 208);

    return encodeCanvasAsWebp(canvas, "poster.webp", 100);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function fetchSpritesheetFile(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not load spritesheet.");
  }
  const blob = await response.blob();
  return new File([blob], "spritesheet.webp", { type: "image/webp" });
}

export async function fetchPetPackageSpritesheet(downloadUrl: string) {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error("Could not load pet package.");
  }
  const { unzipSync } = await import("fflate");
  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const spritesheetPath = Object.keys(archive).find((path) => path === "spritesheet.webp" || path.endsWith("/spritesheet.webp"));
  if (!spritesheetPath) {
    throw new Error("Pet package does not contain spritesheet.webp.");
  }
  const spritesheetBytes = new Uint8Array(archive[spritesheetPath]);
  return new File([spritesheetBytes.buffer as ArrayBuffer], "spritesheet.webp", { type: "image/webp" });
}

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
    ) {
      applyRunningDirectionOperation(canvas, context, operation.kind);
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

function applyRunningDirectionOperation(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  operation: SpriteFixOperation
) {
  if (operation === "swap-running-rows") {
    const runningRight = context.getImageData(0, spriteCellHeight, canvas.width, spriteCellHeight);
    const runningLeft = context.getImageData(0, spriteCellHeight * 2, canvas.width, spriteCellHeight);
    context.putImageData(runningLeft, 0, spriteCellHeight);
    context.putImageData(runningRight, 0, spriteCellHeight * 2);
    return;
  }

  const sourceRow = operation === "mirror-right-to-left" ? 1 : 2;
  const targetRow = operation === "mirror-right-to-left" ? 2 : 1;
  const source = context.getImageData(0, sourceRow * spriteCellHeight, canvas.width, spriteCellHeight);
  const target = context.createImageData(canvas.width, spriteCellHeight);
  for (let frame = 0; frame < 8; frame += 1) {
    for (let y = 0; y < spriteCellHeight; y += 1) {
      for (let x = 0; x < spriteCellWidth; x += 1) {
        const sourceIndex = (y * canvas.width + frame * spriteCellWidth + x) * 4;
        const targetIndex = (y * canvas.width + frame * spriteCellWidth + spriteCellWidth - 1 - x) * 4;
        target.data[targetIndex] = source.data[sourceIndex];
        target.data[targetIndex + 1] = source.data[sourceIndex + 1];
        target.data[targetIndex + 2] = source.data[sourceIndex + 2];
        target.data[targetIndex + 3] = source.data[sourceIndex + 3];
      }
    }
  }
  context.putImageData(target, 0, targetRow * spriteCellHeight);
}

function applyRowRemap(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  rowMap: Record<number, number>
) {
  const sourceCanvas = snapshotCanvas(canvas);
  for (const state of petStates) {
    const sourceRow = clampInteger(rowMap[state.row] ?? state.row, 0, petStates.length - 1);
    context.clearRect(0, state.row * spriteCellHeight, canvas.width, spriteCellHeight);
    context.drawImage(
      sourceCanvas,
      0,
      sourceRow * spriteCellHeight,
      canvas.width,
      spriteCellHeight,
      0,
      state.row * spriteCellHeight,
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
  const normalizedRow = clampInteger(row, 0, petStates.length - 1);
  const frameCount = frameCountForRow(normalizedRow);
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
  for (const transform of transforms) {
    const row = clampInteger(transform.row, 0, petStates.length - 1);
    const dx = clampInteger(transform.dx, -48, 48);
    const dy = clampInteger(transform.dy, -48, 48);
    const rotate = normalizeRotation(transform.rotate);
    if (dx === 0 && dy === 0 && rotate === 0) continue;
    for (const frame of framesForTarget(row, transform.frame)) {
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
  const row = clampInteger(operation.row, 0, petStates.length - 1);
  const frame = clampInteger(operation.frame, 0, frameCountForRow(row) - 1);
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

function framesForTarget(row: number, target: SpriteFrameTarget) {
  const frameCount = frameCountForRow(row);
  return target === "all"
    ? Array.from({ length: frameCount }, (_, frame) => frame)
    : [clampInteger(target, 0, frameCount - 1)];
}

function frameCountForRow(row: number) {
  return petStates.find((state) => state.row === row)?.frames ?? 8;
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(Number.isFinite(value) ? value : min), min), max);
}

function normalizeRotation(value: number) {
  const normalized = ((clampInteger(value, -270, 270) % 360) + 360) % 360;
  return normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0;
}

export async function encodeCanvasAsLosslessWebp(canvas: HTMLCanvasElement, fileName: string) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(`Could not create ${fileName}.`);
  }
  const encode = await loadWebpEncoder();
  const buffer = await encode(context.getImageData(0, 0, canvas.width, canvas.height), {
    lossless: 1,
    exact: 1
  });
  return new File([buffer], fileName, { type: "image/webp" });
}

function loadWebpEncoder() {
  webpEncodePromise ??= import("@jsquash/webp/encode").then(async ({ default: encode, init }) => {
    await init({
      locateFile: (path: string) => path.includes("simd") ? webpEncSimdWasmUrl : webpEncWasmUrl
    });
    return encode;
  });
  return webpEncodePromise;
}

async function encodeCanvasAsWebp(
  canvas: HTMLCanvasElement,
  fileName: string,
  quality: number
) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality / 100);
  });
  if (!blob) {
    throw new Error(`Could not create ${fileName}.`);
  }
  return new File([blob], fileName, { type: "image/webp" });
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  let line = "";
  let lineCount = 0;

  function writeLine(value: string) {
    context.fillText(value, x, y + lineCount * lineHeight);
    lineCount += 1;
    return lineCount < maxLines;
  }

  for (const word of words) {
    let remaining = word;
    while (remaining) {
      const next = line ? `${line} ${remaining}` : remaining;
      if (context.measureText(next).width <= maxWidth) {
        line = next;
        break;
      }
      if (line) {
        if (!writeLine(line)) return;
        line = "";
        continue;
      }
      const split = splitCanvasWord(context, remaining, maxWidth);
      if (!writeLine(split.head)) return;
      remaining = split.tail;
    }
  }

  if (line && lineCount < maxLines) {
    context.fillText(line, x, y + lineCount * lineHeight);
  }
}

function splitCanvasWord(context: CanvasRenderingContext2D, word: string, maxWidth: number) {
  const chars = Array.from(word);
  let end = 0;
  let head = "";
  for (; end < chars.length; end += 1) {
    const next = head + chars[end];
    if (head && context.measureText(next).width > maxWidth) {
      break;
    }
    head = next;
  }
  return {
    head: head || chars[0] || "",
    tail: chars.slice(Math.max(end, 1)).join("")
  };
}
