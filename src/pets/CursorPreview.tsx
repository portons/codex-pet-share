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
  petStates,
  type CursorPreviewStateId
} from "../domain/config";
import type { Pet } from "../domain/types";
import { PetSprite } from "./PetPreview";

export function CursorPetPreview({
  pet,
  stateId
}: {
  pet: Pet;
  stateId: CursorPreviewStateId;
}) {
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

export function useCursorPreviewMotion(enabled: boolean) {
  const [cursorPoint, setCursorPoint] = useState<{ x: number; y: number } | null>(null);
  const [stateId, setStateId] = useState<CursorPreviewStateId>("idle");
  const [rotationDeg, setRotationDeg] = useState(0);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastXRef = useRef<number | null>(null);
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
      lastXRef.current = null;
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
      }, cursorIdleDelayMs);
      waitingTimerRef.current = window.setTimeout(() => {
        setStateId("waiting");
        setRotationDeg(0);
      }, cursorWaitingDelayMs);
    };

    const startPoint = lastPointerRef.current || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    setCursorPoint(clampCursorPreviewPoint(startPoint.x, startPoint.y));
    setStateId("idle");
    setRotationDeg(0);
    lastXRef.current = startPoint.x;
    lastTimeRef.current = performance.now();
    resetTimers();

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      setCursorPoint(clampCursorPreviewPoint(event.clientX, event.clientY));
      if (lastXRef.current !== null && lastTimeRef.current !== null) {
        const deltaX = event.clientX - lastXRef.current;
        if (Math.abs(deltaX) >= 2) {
          const deltaTime = Math.max(now - lastTimeRef.current, 1);
          const speed = Math.abs(deltaX) / deltaTime;
          const tilt = Math.min(
            cursorPreviewMaxTiltDeg,
            Math.max(cursorPreviewMinTiltDeg, speed * cursorPreviewTiltSpeedFactor)
          );
          setStateId(deltaX > 0 ? "running-right" : "running-left");
          setRotationDeg(deltaX > 0 ? tilt : -tilt);
        }
      }
      lastXRef.current = event.clientX;
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
  }, [enabled]);

  return { cursorPoint, cursorStateId: stateId, cursorRotationDeg: rotationDeg };
}
