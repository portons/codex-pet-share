import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { petTextureAssetUrl } from "../../domain/http";
import type { Pet } from "../../domain/types";
import { petAtlasRowsFromHeight } from "../core/config";
import type { RoomMode } from "../room/types";

const SWAP_COOLDOWN_MS = 30_000;

export function usePetSwap({
  pet,
  roomMode,
  spriteTextureRef,
  onCloseRef
}: {
  pet: Pet;
  roomMode?: RoomMode;
  spriteTextureRef: RefObject<THREE.Texture | null>;
  onCloseRef: RefObject<(() => void | Promise<void>)>;
}) {
  const livePetRef = useRef<{ id: string; displayName: string; spritesheetUrl: string }>({
    id: pet.id, displayName: pet.displayName, spritesheetUrl: pet.spritesheetUrl
  });
  const [liveLocalPet, setLiveLocalPet] = useState<{ id: string; displayName: string; spritesheetUrl: string }>(livePetRef.current);
  const [swapMenuOpen, setSwapMenuOpen] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [lastSwapAt, setLastSwapAt] = useState(0);
  const [swapQuery, setSwapQuery] = useState("");
  const [hostClosed, setHostClosed] = useState(false);
  const [, forceTickSwap] = useState(0);
  const swapMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostClosed) return;
    const t = window.setTimeout(() => onCloseRef.current?.(), 5000);
    return () => window.clearTimeout(t);
  }, [hostClosed, onCloseRef]);

  useEffect(() => {
    if (!roomMode) return;
    const t = window.setInterval(() => forceTickSwap((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [roomMode]);

  const cooldownRemainingMs = Math.max(0, lastSwapAt + SWAP_COOLDOWN_MS - Date.now());
  const swapCooling = cooldownRemainingMs > 0;

  useEffect(() => {
    if (!swapMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      const node = swapMenuRef.current;
      if (!node) return;
      if (!node.contains(e.target as Node)) setSwapMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSwapMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [swapMenuOpen]);

  async function swapToPet(target: { id: string; displayName: string; spritesheetUrl: string }) {
    if (!roomMode || swapCooling) return;
    if (target.id === livePetRef.current.id) {
      setSwapMenuOpen(false);
      return;
    }
    const tex = spriteTextureRef.current;
    if (!tex) return;
    const spritesheetUrl = petTextureAssetUrl(target.spritesheetUrl);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.decoding = "async";
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Couldn't load spritesheet."));
        i.src = spritesheetUrl;
      });
      tex.image = img;
      tex.repeat.y = 1 / petAtlasRowsFromHeight(img.naturalHeight);
      tex.needsUpdate = true;

      livePetRef.current = { id: target.id, displayName: target.displayName, spritesheetUrl };
      setLiveLocalPet(livePetRef.current);
      setLastSwapAt(Date.now());
      setSwapMenuOpen(false);

      void roomMode.channel.retrackPresence({
        petId: target.id,
        petDisplayName: target.displayName,
        spritesheetUrl
      }).catch(() => { /* best-effort */ });
      roomMode.channel.broadcastPetSwap({
        userId: roomMode.ownUserId,
        petId: target.id,
        petDisplayName: target.displayName,
        spritesheetUrl
      });
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : "Pet swap failed.");
    }
  }

  return {
    liveLocalPet,
    swapMenuRef,
    swapMenuOpen,
    setSwapMenuOpen,
    swapError,
    swapQuery,
    setSwapQuery,
    cooldownRemainingMs,
    swapCooling,
    swapToPet,
    hostClosed,
    setHostClosed
  };
}
