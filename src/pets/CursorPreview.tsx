import { useEffect, useRef, useState } from "react";
import {
  cursorIdleDelayMs,
  cursorPreviewHeight,
  cursorPreviewMaxTiltDeg,
  cursorPreviewMinTiltDeg,
  cursorPreviewOffset,
  cursorPreviewTiltSpeedFactor,
  cursorPreviewWidth,
  cursorWaitingDelayMs,
  lookDirectionCell,
  lookDirectionStepDegrees,
  petStates,
  type CursorPreviewStateId
} from "../domain/config";
import type { Pet } from "../domain/types";
import { PetSprite } from "./PetPreview";

export function CursorPetPreview({
  pet,
  stateId,
  lookDirectionIndex
}: {
  pet: Pet;
  stateId: CursorPreviewStateId;
  lookDirectionIndex?: number | null;
}) {
  if (pet.spriteVersionNumber === 2 && lookDirectionIndex !== null && lookDirectionIndex !== undefined) {
    const lookCell = lookDirectionCell(lookDirectionIndex);
    return (
      <PetSprite
        pet={pet}
        row={lookCell.row}
        frames={1}
        staticFrame={lookCell.frame}
        label={`${lookDirectionIndex * lookDirectionStepDegrees} degree look`}
        size="small"
        transparent
      />
    );
  }
  const state = petStates.find((petState) => petState.id === stateId) || petStates[0];
  return (
    <PetSprite
      pet={pet}
      row={state.row}
      frames={state.frames}
      label={state.label}
      size="small"
      transparent
    />
  );
}

export function useCursorPreviewSupport() {
  const [supported, setSupported] = useState(() =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = () => setSupported(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return supported;
}

function clampCursorPreviewPoint(clientX: number, clientY: number) {
  return {
    x: Math.min(
      Math.max(cursorPreviewOffset, clientX + cursorPreviewOffset),
      Math.max(cursorPreviewOffset, window.innerWidth - cursorPreviewWidth - cursorPreviewOffset)
    ),
    y: Math.min(
      Math.max(cursorPreviewOffset, clientY + cursorPreviewOffset),
      Math.max(cursorPreviewOffset, window.innerHeight - cursorPreviewHeight - cursorPreviewOffset)
    )
  };
}

function preloadImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not load preview asset."));
    image.src = url;
    if (image.complete) {
      resolve();
    }
  });
}

export function useCursorPreviewAssets(pet: Pet | null, enabled: boolean) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    if (!enabled || !pet) {
      return () => {
        cancelled = true;
      };
    }

    preloadImage(pet.spritesheetUrl)
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, pet?.id, pet?.spritesheetUrl]);

  return ready;
}

export function useCursorPreviewMotion(enabled: boolean, useLookDirections = false) {
  const [cursorPoint, setCursorPoint] = useState<{ x: number; y: number } | null>(null);
  const [stateId, setStateId] = useState<CursorPreviewStateId>("idle");
  const [rotationDeg, setRotationDeg] = useState(0);
  const [lookDirectionIndex, setLookDirectionIndex] = useState<number | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastXRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const waitingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const rememberPointer = (event: PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
    };

    window.addEventListener("pointermove", rememberPointer, { passive: true });
    window.addEventListener("pointerdown", rememberPointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", rememberPointer);
      window.removeEventListener("pointerdown", rememberPointer);
    };
  }, []);

  useEffect(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (waitingTimerRef.current) {
      window.clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }

    if (!enabled) {
      setCursorPoint(null);
      setStateId("idle");
      setRotationDeg(0);
      setLookDirectionIndex(null);
      lastXRef.current = null;
      lastYRef.current = null;
      lastTimeRef.current = null;
      return;
    }

    const resetTimers = () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      if (waitingTimerRef.current) {
        window.clearTimeout(waitingTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        setStateId("idle");
        setRotationDeg(0);
        setLookDirectionIndex(null);
      }, cursorIdleDelayMs);
      waitingTimerRef.current = window.setTimeout(() => {
        setStateId("waiting");
        setRotationDeg(0);
        setLookDirectionIndex(null);
      }, cursorWaitingDelayMs);
    };

    const startPoint = lastPointerRef.current || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    setCursorPoint(clampCursorPreviewPoint(startPoint.x, startPoint.y));
    setStateId("idle");
    setRotationDeg(0);
    lastXRef.current = startPoint.x;
    lastYRef.current = startPoint.y;
    lastTimeRef.current = performance.now();
    resetTimers();

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      setCursorPoint(clampCursorPreviewPoint(event.clientX, event.clientY));
      if (lastXRef.current !== null && lastYRef.current !== null && lastTimeRef.current !== null) {
        const deltaX = event.clientX - lastXRef.current;
        const deltaY = event.clientY - lastYRef.current;
        if (Math.hypot(deltaX, deltaY) >= 2) {
          const deltaTime = Math.max(now - lastTimeRef.current, 1);
          const speed = Math.abs(deltaX) / deltaTime;
          const tilt = Math.min(
            cursorPreviewMaxTiltDeg,
            Math.max(cursorPreviewMinTiltDeg, speed * cursorPreviewTiltSpeedFactor)
          );
          if (useLookDirections) {
            const clockwiseFromUp = (Math.atan2(deltaX, -deltaY) * 180 / Math.PI + 360) % 360;
            setLookDirectionIndex(Math.round(clockwiseFromUp / lookDirectionStepDegrees) % 16);
            setRotationDeg(0);
          } else if (Math.abs(deltaX) >= 2) {
            setStateId(deltaX > 0 ? "running-right" : "running-left");
            setRotationDeg(deltaX > 0 ? tilt : -tilt);
          }
        }
      }
      lastXRef.current = event.clientX;
      lastYRef.current = event.clientY;
      lastTimeRef.current = now;
      resetTimers();
    };

    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      if (waitingTimerRef.current) {
        window.clearTimeout(waitingTimerRef.current);
        waitingTimerRef.current = null;
      }
    };
  }, [enabled, useLookDirections]);

  return { cursorPoint, cursorStateId: stateId, cursorRotationDeg: rotationDeg, cursorLookDirectionIndex: lookDirectionIndex };
}
