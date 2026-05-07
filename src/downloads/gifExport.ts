import {
  gifAlphaThreshold,
  spriteCellHeight,
  spriteCellWidth,
  type PetState
} from "../domain/config";
import { apiUrl } from "../domain/http";
import { loadGifenc } from "../domain/lazyCodecs";
import type { Pet } from "../domain/types";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function bytesToArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function loadImageFromBlob(blob: Blob) {
  const imageUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;
    try {
      await image.decode();
    } catch {
      throw new Error("Could not decode spritesheet.");
    }
    return image;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function loadPetSpritesheet(pet: Pet) {
  let response: Response;
  try {
    response = await fetch(apiUrl(`/api/pets/${encodeURIComponent(pet.id)}/spritesheet`));
  } catch {
    throw new Error("Could not load spritesheet for GIF export.");
  }
  if (!response.ok) {
    throw new Error("Could not load spritesheet for GIF export.");
  }
  return loadImageFromBlob(await response.blob());
}

function snapAlphaToBinary(data: Uint8ClampedArray, threshold: number) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < threshold) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    } else {
      data[i + 3] = 255;
    }
  }
}

export async function encodePetStateGif(spritesheet: HTMLImageElement, state: PetState) {
  const { applyPalette, GIFEncoder, quantize } = await loadGifenc();
  const canvas = document.createElement("canvas");
  canvas.width = spriteCellWidth;
  canvas.height = spriteCellHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Could not create GIF canvas.");
  }

  context.imageSmoothingEnabled = false;
  const gif = GIFEncoder();
  const frameDelay = Math.round(Math.max(state.frames * 180, 1000) / state.frames);
  const frameByteLength = spriteCellWidth * spriteCellHeight * 4;
  const frameBuffers: Uint8ClampedArray[] = [];
  const combined = new Uint8ClampedArray(frameByteLength * state.frames);

  for (let frame = 0; frame < state.frames; frame += 1) {
    context.clearRect(0, 0, spriteCellWidth, spriteCellHeight);
    context.drawImage(
      spritesheet,
      frame * spriteCellWidth,
      state.row * spriteCellHeight,
      spriteCellWidth,
      spriteCellHeight,
      0,
      0,
      spriteCellWidth,
      spriteCellHeight
    );
    const frameData = context.getImageData(0, 0, spriteCellWidth, spriteCellHeight).data;
    snapAlphaToBinary(frameData, gifAlphaThreshold);
    frameBuffers.push(frameData);
    combined.set(frameData, frame * frameByteLength);
  }

  const palette = quantize(combined, 256, {
    format: "rgba4444",
    oneBitAlpha: 128,
    clearAlpha: true
  });
  const transparentIndex = palette.findIndex((color) => (color.length > 3 ? color[3] : 255) === 0);

  for (const frameData of frameBuffers) {
    const indexedFrame = applyPalette(frameData, palette, "rgba4444");
    gif.writeFrame(indexedFrame, spriteCellWidth, spriteCellHeight, {
      palette,
      delay: frameDelay,
      repeat: 0,
      dispose: 2,
      transparent: transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : 0
    });
  }

  gif.finish();
  return new Blob([bytesToArrayBuffer(gif.bytes())], { type: "image/gif" });
}
