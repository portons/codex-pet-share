import { useCallback, type Dispatch, type SetStateAction } from "react";
import { petFrameLabel, spriteCellHeight, spriteCellWidth } from "../../domain/config";
import type { Pet } from "../../domain/types";
import { pixelModes } from "./editorConfig";
import { PanelTitle, RangeField, SegmentedControl, StageHeading } from "./EditorControls";
import { FrameThumbnailPicker, RowThumbnailPicker } from "./FramePickers";
import { PixelCleanCanvas, PixelMiniPreview } from "./PixelCleanCanvas";
import { pixelKey } from "./pixelData";
import { stateForRow } from "./rowPlans";
import { SpriteFrame } from "./SpriteFrames";
import { useSpriteCellImageData } from "./useSpriteCellImageData";
import type { PixelMode, PixelPatchMap } from "./types";

export function PixelInspector({
  busy,
  mode,
  setMode,
  zoom,
  setZoom,
  brushSize,
  setBrushSize,
  tolerance,
  setTolerance,
  editCount,
  clearEdits
}: {
  busy: boolean;
  mode: PixelMode;
  setMode: (mode: PixelMode) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  tolerance: number;
  setTolerance: (value: number) => void;
  editCount: number;
  clearEdits: () => void;
}) {
  return (
    <div className="spriteEditorInspectorPanel">
      <PanelTitle title="Pixel clean" />
      <p className="spriteEditorPlanText">Click a row and frame in the workbench, then edit the chosen cell at true pixel level.</p>
      <SegmentedControl<PixelMode> label="Tool" value={mode} values={pixelModes} disabled={busy} onChange={setMode} />
      <RangeField label="Zoom" min={2} max={10} step={1} value={zoom} disabled={busy} valueLabel={`${zoom}x`} onChange={setZoom} />
      <RangeField
        label="Brush"
        min={1}
        max={15}
        step={2}
        value={brushSize}
        disabled={busy || mode === "sample"}
        valueLabel={`${brushSize}px`}
        onChange={setBrushSize}
      />
      <RangeField
        label="Sample tolerance"
        min={0}
        max={96}
        step={1}
        value={tolerance}
        disabled={busy || mode !== "sample"}
        valueLabel={`${tolerance}`}
        onChange={setTolerance}
      />
      <div className="spriteEditorInlineStats">
        <span>{editCount} changed pixels</span>
        <button className="btn btnSm" type="button" disabled={busy || editCount === 0} onClick={clearEdits}>
          Reset draft
        </button>
      </div>
    </div>
  );
}

export function PixelCleanStage({
  pet,
  row,
  frame,
  zoom,
  brushSize,
  mode,
  tolerance,
  edits,
  setRow,
  setFrame,
  setEdits
}: {
  pet: Pet;
  row: number;
  frame: number;
  zoom: number;
  brushSize: number;
  mode: PixelMode;
  tolerance: number;
  edits: PixelPatchMap;
  setRow: (row: number) => void;
  setFrame: (frame: number) => void;
  setEdits: Dispatch<SetStateAction<PixelPatchMap>>;
}) {
  const { imageData, loading, error } = useSpriteCellImageData(pet.downloadUrl, row, frame);
  const editCount = Object.keys(edits).length;

  const applyBrush = useCallback((x: number, y: number) => {
    if (!imageData || mode === "sample") return;
    const radius = Math.floor(brushSize / 2);
    setEdits((current) => {
      const next = { ...current };
      for (let py = y - radius; py <= y + radius; py += 1) {
        for (let px = x - radius; px <= x + radius; px += 1) {
          if (px < 0 || py < 0 || px >= spriteCellWidth || py >= spriteCellHeight) continue;
          const key = pixelKey(px, py);
          if (mode === "restore") {
            delete next[key];
            continue;
          }
          const index = (py * spriteCellWidth + px) * 4;
          next[key] = {
            x: px,
            y: py,
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: 0
          };
        }
      }
      return next;
    });
  }, [brushSize, imageData, mode, setEdits]);

  const applySample = useCallback((x: number, y: number) => {
    if (!imageData) return;
    const sampleIndex = (y * spriteCellWidth + x) * 4;
    const sampleR = imageData.data[sampleIndex];
    const sampleG = imageData.data[sampleIndex + 1];
    const sampleB = imageData.data[sampleIndex + 2];
    const toleranceSquared = tolerance * tolerance;
    setEdits((current) => {
      const next = { ...current };
      for (let py = 0; py < spriteCellHeight; py += 1) {
        for (let px = 0; px < spriteCellWidth; px += 1) {
          const index = (py * spriteCellWidth + px) * 4;
          if (imageData.data[index + 3] === 0) continue;
          const dr = imageData.data[index] - sampleR;
          const dg = imageData.data[index + 1] - sampleG;
          const db = imageData.data[index + 2] - sampleB;
          if (dr * dr + dg * dg + db * db <= toleranceSquared) {
            next[pixelKey(px, py)] = {
              x: px,
              y: py,
              r: imageData.data[index],
              g: imageData.data[index + 1],
              b: imageData.data[index + 2],
              a: 0
            };
          }
        }
      }
      return next;
    });
  }, [imageData, setEdits, tolerance]);

  return (
    <section className="spriteEditorStagePanel pixelStage">
      <StageHeading
        title="Pixel clean"
        label={`${stateForRow(row, pet.spriteVersionNumber).label}, ${petFrameLabel(row, frame, pet.spriteVersionNumber)}`}
      />
      <div className="spriteEditorCellPicker">
        <RowThumbnailPicker pet={pet} selectedRow={row} onSelect={setRow} />
        <FrameThumbnailPicker pet={pet} row={row} selectedFrame={frame} onSelect={setFrame} />
      </div>
      {loading ? <div className="spriteEditorLoading">Loading cell pixels</div> : null}
      {error ? <div className="spriteEditorLoading error">{error}</div> : null}
      {imageData ? (
        <div className="spriteEditorPixelLayout">
          <PixelCleanCanvas
            imageData={imageData}
            edits={edits}
            zoom={zoom}
            brushSize={brushSize}
            mode={mode}
            onPaint={applyBrush}
            onSample={applySample}
          />
          <aside className="spriteEditorPixelPreview">
            <div>
              <span>Original</span>
              <SpriteFrame pet={pet} row={row} frame={frame} size={96} />
            </div>
            <div>
              <span>Draft</span>
              <PixelMiniPreview imageData={imageData} edits={edits} />
            </div>
            <p>{editCount === 0 ? "No pixel edits yet." : `${editCount} pixels will be written into this cell.`}</p>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
