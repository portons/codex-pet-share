import type { RefObject } from "react";
import {
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_STEP_WHEEL,
  MOVE_KEYS
} from "./config";

const SPRINT_CODES = new Set(["ShiftLeft", "ShiftRight"]);
const EMOTE_CODES = new Set(["KeyE", "KeyQ"]);
const ZOOM_CODES = new Set(["Equal", "Minus", "NumpadAdd", "NumpadSubtract"]);
const TOY_CODES = new Set(["KeyB", "KeyT"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function attachKeyboardControls({
  pressed,
  clearPressedKeysRef
}: {
  pressed: Set<string>;
  clearPressedKeysRef: RefObject<(() => void) | null>;
}) {
  function handleKeyDown(event: KeyboardEvent) {
    if (isTypingTarget(event.target)) return;
    const isMove = event.code in MOVE_KEYS;
    const isJump = event.code === "Space";
    const isSprint = SPRINT_CODES.has(event.code);
    const isEmote = EMOTE_CODES.has(event.code);
    const isZoom = ZOOM_CODES.has(event.code);
    const isToy = TOY_CODES.has(event.code);
    if (isMove || isJump || isSprint || isEmote || isZoom || isToy) {
      pressed.add(event.code);
      if (!isSprint) {
        event.preventDefault();
      }
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (isTypingTarget(event.target)) return;
    pressed.delete(event.code);
    if (event.code in MOVE_KEYS || event.code === "Space" || EMOTE_CODES.has(event.code) || ZOOM_CODES.has(event.code) || TOY_CODES.has(event.code)) {
      event.preventDefault();
    }
  }

  function handleBlur() {
    pressed.clear();
  }

  clearPressedKeysRef.current = () => pressed.clear();
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", handleBlur);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", handleBlur);
  };
}

export function attachZoomControls({
  canvas,
  wrapper,
  zoomState
}: {
  canvas: HTMLCanvasElement;
  wrapper: HTMLDivElement;
  zoomState: { value: number };
}) {
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const px = event.deltaMode === 1 ? event.deltaY * 24 : event.deltaY;
    const next = zoomState.value + px * CAMERA_ZOOM_STEP_WHEEL;
    zoomState.value = Math.max(CAMERA_ZOOM_MIN, Math.min(CAMERA_ZOOM_MAX, next));
  };

  canvas.addEventListener("wheel", onWheel, { passive: false });
  wrapper.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    canvas.removeEventListener("wheel", onWheel);
    wrapper.removeEventListener("wheel", onWheel);
  };
}

export function attachCameraDragControls({
  canvas,
  yawState
}: {
  canvas: HTMLCanvasElement;
  yawState: { value: number };
}) {
  let dragging = false;
  let dragLastX = 0;
  let dragPointerId = -1;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    dragging = true;
    dragLastX = event.clientX;
    dragPointerId = event.pointerId;
    try { canvas.setPointerCapture(event.pointerId); } catch { /* noop */ }
    canvas.style.cursor = "grabbing";
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const delta = event.clientX - dragLastX;
    dragLastX = event.clientX;
    yawState.value -= delta * (Math.PI / 400);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    try { canvas.releasePointerCapture(dragPointerId); } catch { /* noop */ }
    dragPointerId = -1;
    canvas.style.cursor = "grab";
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerUp);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("pointerleave", onPointerUp);
  };
}
