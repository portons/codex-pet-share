import { spriteCellHeight, spriteCellWidth } from "../../domain/config";
import type { PixelPatchMap } from "./types";

export function pixelKey(x: number, y: number) {
  return `${x}:${y}`;
}

export function renderPixelData(imageData: ImageData, edits: PixelPatchMap) {
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

export function drawCheckerboard(context: CanvasRenderingContext2D, width: number, height: number, size: number) {
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

export function visiblePixelBounds(imageData: ImageData) {
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
