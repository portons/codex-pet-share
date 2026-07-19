import { APP_HANDLE, APP_NAME } from "../../branding/brand";
import { previewFrameCountForVersion, previewSpriteFramesForVersion } from "../../domain/config";
import type { PetSpriteVersion, UploadManifest } from "../../domain/types";
import { encodeCanvasAsWebp } from "./webpEncode";

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

export async function generatePreviewImage(spritesheet: File, spriteVersionNumber: PetSpriteVersion = 1) {
  const imageUrl = URL.createObjectURL(spritesheet);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    const previewFrames = previewSpriteFramesForVersion(spriteVersionNumber);
    canvas.width = previewFrameCountForVersion(spriteVersionNumber) * 96;
    canvas.height = 104;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create preview image.");
    }

    context.imageSmoothingEnabled = false;
    let frameIndex = 0;
    for (const frame of previewFrames) {
      context.drawImage(
        image,
        frame.frame * 192,
        frame.row * 208,
        192,
        208,
        frameIndex * 96,
        0,
        96,
        104
      );
      frameIndex += 1;
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
