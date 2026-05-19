import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from "react";
import webpEncWasmUrl from "@jsquash/webp/codec/enc/webp_enc.wasm?url";
import webpEncSimdWasmUrl from "@jsquash/webp/codec/enc/webp_enc_simd.wasm?url";
import { petStates, spriteCellHeight, spriteCellWidth } from "../domain/config";
import type { Pet, User } from "../domain/types";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";

const avatarSize = 256;
const minScale = 1;
const maxScale = 3;
let avatarWebpEncodePromise: Promise<typeof import("@jsquash/webp/encode").default> | null = null;

type AvatarSourceKind = "upload" | "pet";

type LoadedSource = {
  url: string;
  rect: { x: number; y: number; width: number; height: number };
};

type DragState = {
  pointerId: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
};

export function AvatarEditor({
  user,
  pets,
  petsLoading,
  status,
  busy,
  onReloadPets,
  onSubmit
}: {
  user: User;
  pets: Pet[];
  petsLoading: boolean;
  status: string;
  busy: boolean;
  onReloadPets: () => void | Promise<void>;
  onSubmit: (avatar: Blob) => void | Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [sourceKind, setSourceKind] = useState<AvatarSourceKind>("upload");
  const [source, setSource] = useState<LoadedSource | null>(user.avatarUrl ? {
    url: user.avatarUrl,
    rect: { x: 0, y: 0, width: avatarSize, height: avatarSize }
  } : null);
  const [sourceReady, setSourceReady] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedStateId, setSelectedStateId] = useState("idle");
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [scale, setScale] = useState(1.14);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [localStatus, setLocalStatus] = useState("");
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) || null;
  const selectedState = petStates.find((state) => state.id === selectedStateId) || petStates[0];

  useEffect(() => {
    return () => revokeObjectUrl();
  }, []);

  useEffect(() => {
    if (!selectedPetId && pets.length) setSelectedPetId(pets[0].id);
  }, [pets, selectedPetId]);

  useEffect(() => {
    if (sourceKind !== "pet" || !selectedPet) return;
    setSelectedFrame((frame) => Math.min(frame, selectedState.frames - 1));
    setSource({
      url: selectedPet.spritesheetUrl,
      rect: {
        x: selectedFrame * spriteCellWidth,
        y: selectedState.row * spriteCellHeight,
        width: spriteCellWidth,
        height: spriteCellHeight
      }
    });
    setScale(1.18);
    setOffset({ x: 0, y: -6 });
    setLocalStatus("");
  }, [sourceKind, selectedPet, selectedFrame, selectedState.frames, selectedState.row]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, avatarSize, avatarSize);
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#f8f4e8";
    context.fillRect(0, 0, avatarSize, avatarSize);
    const image = imageRef.current;
    if (!image || !sourceReady || !source) return;
    const baseScale = Math.max(avatarSize / source.rect.width, avatarSize / source.rect.height);
    const drawWidth = source.rect.width * baseScale * scale;
    const drawHeight = source.rect.height * baseScale * scale;
    const drawX = (avatarSize - drawWidth) / 2 + offset.x;
    const drawY = (avatarSize - drawHeight) / 2 + offset.y;
    context.drawImage(
      image,
      source.rect.x,
      source.rect.y,
      source.rect.width,
      source.rect.height,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );
  }, [source, sourceReady, scale, offset]);

  useEffect(() => {
    if (!source) {
      imageRef.current = null;
      setSourceReady(false);
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      imageRef.current = image;
      setSourceReady(true);
      if (sourceKind !== "pet" && source.rect.width === avatarSize && source.rect.height === avatarSize) {
        setSource((current) => current?.url === source.url ? {
          ...current,
          rect: { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight }
        } : current);
      }
    };
    image.onerror = () => {
      imageRef.current = null;
      setSourceReady(false);
      setLocalStatus("Could not load that image.");
    };
    setSourceReady(false);
    image.src = source.url;
  }, [source?.url, sourceKind]);

  function revokeObjectUrl() {
    if (!objectUrlRef.current) return;
    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }

  function chooseUploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setLocalStatus("Choose an image file.");
      return;
    }
    revokeObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSourceKind("upload");
    setSource({ url, rect: { x: 0, y: 0, width: avatarSize, height: avatarSize } });
    setScale(1.04);
    setOffset({ x: 0, y: 0 });
    setLocalStatus("");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) chooseUploadFile(file);
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!sourceReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const unit = avatarSize / rect.width;
    setOffset({
      x: drag.offsetX + (event.clientX - drag.x) * unit,
      y: drag.offsetY + (event.clientY - drag.y) * unit
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  async function submitAvatar() {
    const canvas = canvasRef.current;
    if (!canvas || !sourceReady) return;
    try {
      await onSubmit(await encodeAvatarCanvas(canvas));
    } catch (error) {
      setLocalStatus(error instanceof Error ? error.message : "Could not render avatar.");
    }
  }

  const shownStatus = localStatus || status;

  return (
    <section className="avatarEditor" aria-label="Avatar">
      <div className="avatarEditorHeader">
        <div>
          <span className="fieldLabel">Avatar</span>
          <small>Upload an image or crop a pet frame.</small>
        </div>
        <div className="avatarSourceTabs" role="tablist" aria-label="Avatar source">
          <button
            className={`btn btnSm ${sourceKind === "upload" ? "btnPrimary" : ""}`}
            type="button"
            onClick={() => setSourceKind("upload")}
            disabled={busy}
          >
            <Icon name="upload" size={13} />
            Upload
          </button>
          <button
            className={`btn btnSm ${sourceKind === "pet" ? "btnPrimary" : ""}`}
            type="button"
            onClick={() => {
              setSourceKind("pet");
              if (!pets.length) void onReloadPets();
            }}
            disabled={busy}
          >
            <Icon name="smile" size={13} />
            Pet frame
          </button>
        </div>
      </div>
      <div className="avatarEditorGrid">
        <div
          className="avatarStage"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <canvas
            ref={canvasRef}
            width={avatarSize}
            height={avatarSize}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label="Avatar crop"
          />
          {!source && (
            <button className="avatarEmptyButton" type="button" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              <Icon name="upload" size={18} />
              <span>Drop image</span>
            </button>
          )}
        </div>
        <div className="avatarControls">
          {sourceKind === "upload" ? (
            <div className="avatarControlPanel">
              <input
                ref={fileInputRef}
                className="visuallyHiddenInput"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) chooseUploadFile(file);
                  event.target.value = "";
                }}
              />
              <button className="btn btnLg" type="button" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                <Icon name="upload" size={14} />
                Choose image
              </button>
              <p className="avatarHint">Drag inside the square to position the crop.</p>
            </div>
          ) : (
            <div className="avatarControlPanel">
              <label>
                <span className="fieldLabel">Pet</span>
                <select
                  className="input"
                  value={selectedPetId}
                  onChange={(event) => setSelectedPetId(event.target.value)}
                  disabled={busy || petsLoading || !pets.length}
                >
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>{pet.displayName}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="fieldLabel">State</span>
                <select
                  className="input"
                  value={selectedStateId}
                  onChange={(event) => {
                    setSelectedStateId(event.target.value);
                    setSelectedFrame(0);
                  }}
                  disabled={busy || !selectedPet}
                >
                  {petStates.map((state) => (
                    <option key={state.id} value={state.id}>{state.label}</option>
                  ))}
                </select>
              </label>
              <div className="avatarFramePicker" aria-label="Frame">
                {Array.from({ length: selectedState.frames }, (_, frame) => (
                  <button
                    className={selectedFrame === frame ? "isSelected" : ""}
                    type="button"
                    key={frame}
                    onClick={() => setSelectedFrame(frame)}
                    disabled={busy || !selectedPet}
                    aria-label={`Frame ${frame + 1}`}
                  >
                    {selectedPet ? (
                      <span
                        className="avatarFrameThumb"
                        aria-hidden="true"
                        style={{
                          backgroundImage: `url(${selectedPet.spritesheetUrl})`,
                          backgroundPosition: `-${frame * 24}px -${selectedState.row * 26}px`,
                          backgroundSize: `${8 * 24}px ${petStates.length * 26}px`
                        }}
                      />
                    ) : frame + 1}
                  </button>
                ))}
              </div>
              {petsLoading && <p className="avatarHint">Loading your pets.</p>}
              {!petsLoading && !pets.length && <p className="avatarHint">No uploaded pets yet.</p>}
            </div>
          )}
          <label className="avatarScaleControl">
            <span className="fieldLabel">Scale</span>
            <input
              type="range"
              min={minScale}
              max={maxScale}
              step={0.02}
              value={scale}
              onChange={(event) => setScale(Number(event.target.value))}
              disabled={busy || !source}
            />
          </label>
          <div className="avatarActionRow">
            <button className="btn btnPrimary btnLg" type="button" onClick={() => void submitAvatar()} disabled={busy || !sourceReady}>
              {busy ? <Spinner size={14} /> : <Icon name="check" size={14} />}
              {busy ? "Saving" : "Save avatar"}
            </button>
            <button className="btn btnLg" type="button" disabled={busy || !source} onClick={() => {
              setScale(sourceKind === "pet" ? 1.18 : 1.04);
              setOffset({ x: 0, y: sourceKind === "pet" ? -6 : 0 });
            }}>
              <Icon name="move" size={14} />
              Reset
            </button>
          </div>
        </div>
      </div>
      {shownStatus && <p className="avatarStatus" role="status">{shownStatus}</p>}
    </section>
  );
}

async function encodeAvatarCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not render avatar.");
  const encode = await loadAvatarWebpEncoder();
  const buffer = await encode(context.getImageData(0, 0, canvas.width, canvas.height), {
    quality: 88,
    alpha_quality: 100,
    exact: 1
  });
  return new File([buffer], "avatar.webp", { type: "image/webp" });
}

function loadAvatarWebpEncoder() {
  avatarWebpEncodePromise ??= import("@jsquash/webp/encode").then(async ({ default: encode, init }) => {
    await init({
      locateFile: (path: string) => path.includes("simd") ? webpEncSimdWasmUrl : webpEncWasmUrl
    });
    return encode;
  });
  return avatarWebpEncodePromise;
}
