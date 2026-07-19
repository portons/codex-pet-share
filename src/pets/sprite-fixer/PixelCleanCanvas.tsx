import { useEffect, useRef, useState, type PointerEvent } from "react";
import { spriteCellHeight, spriteCellWidth } from "../../domain/config";
import { drawCheckerboard, renderPixelData, visiblePixelBounds } from "./pixelData";
import type { PixelMode, PixelPatchMap } from "./types";

export function PixelCleanCanvas({
  imageData,
  edits,
  zoom,
  brushSize,
  mode,
  onPaint,
  onSample
}: {
  imageData: ImageData;
  edits: PixelPatchMap;
  zoom: number;
  brushSize: number;
  mode: PixelMode;
  onPaint: (x: number, y: number) => void;
  onSample: (x: number, y: number) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = spriteCellWidth * zoom;
    canvas.height = spriteCellHeight * zoom;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    drawCheckerboard(context, canvas.width, canvas.height, zoom * 4);

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = spriteCellWidth;
    sourceCanvas.height = spriteCellHeight;
    const sourceContext = sourceCanvas.getContext("2d");
    if (!sourceContext) return;
    sourceContext.putImageData(renderPixelData(imageData, edits), 0, 0);
    context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

    if (zoom >= 5) {
      context.strokeStyle = "rgba(255, 255, 255, 0.055)";
      context.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += zoom) {
        context.beginPath();
        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, canvas.height);
        context.stroke();
      }
      for (let y = 0; y <= canvas.height; y += zoom) {
        context.beginPath();
        context.moveTo(0, y + 0.5);
        context.lineTo(canvas.width, y + 0.5);
        context.stroke();
      }
    }

    if (hover) {
      const half = Math.floor(brushSize / 2);
      const x = (hover.x - half) * zoom;
      const y = (hover.y - half) * zoom;
      const size = brushSize * zoom;
      context.strokeStyle = mode === "restore" ? "#f5f0dc" : "#d8f25a";
      context.lineWidth = 2;
      context.strokeRect(x + 1, y + 1, size - 2, size - 2);
    }
  }, [brushSize, edits, hover, imageData, mode, zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const bounds = visiblePixelBounds(imageData);
    if (!bounds) return;
    const centerX = ((bounds.minX + bounds.maxX + 1) / 2) * zoom;
    const centerY = ((bounds.minY + bounds.maxY + 1) / 2) * zoom;
    viewport.scrollLeft = Math.max(0, centerX - viewport.clientWidth / 2);
    viewport.scrollTop = Math.max(0, centerY - viewport.clientHeight / 2);
  }, [imageData, zoom]);

  function pointForEvent(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / zoom);
    const y = Math.floor((event.clientY - rect.top) / zoom);
    if (x < 0 || y < 0 || x >= spriteCellWidth || y >= spriteCellHeight) return null;
    return { x, y };
  }

  function applyPointer(event: PointerEvent<HTMLCanvasElement>) {
    const point = pointForEvent(event);
    if (!point) return;
    setHover(point);
    if (mode === "sample") {
      onSample(point.x, point.y);
      return;
    }
    onPaint(point.x, point.y);
  }

  return (
    <div className="spriteEditorPixelCanvasViewport" ref={viewportRef}>
      <canvas
        aria-label="Pixel editor canvas"
        className={`spriteEditorPixelCanvas ${mode}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drawingRef.current = true;
          applyPointer(event);
        }}
        onPointerMove={(event) => {
          const point = pointForEvent(event);
          setHover(point);
          if (drawingRef.current && mode !== "sample") {
            applyPointer(event);
          }
        }}
        onPointerLeave={() => setHover(null)}
        onPointerUp={(event) => {
          drawingRef.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        ref={canvasRef}
      />
    </div>
  );
}

export function PixelMiniPreview({ imageData, edits }: { imageData: ImageData; edits: PixelPatchMap }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 96;
    canvas.height = 104;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    drawCheckerboard(context, canvas.width, canvas.height, 8);
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = spriteCellWidth;
    sourceCanvas.height = spriteCellHeight;
    const sourceContext = sourceCanvas.getContext("2d");
    if (!sourceContext) return;
    sourceContext.putImageData(renderPixelData(imageData, edits), 0, 0);
    context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  }, [edits, imageData]);
  return <canvas className="spriteEditorMiniCanvas" ref={canvasRef} />;
}
