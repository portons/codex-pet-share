import { useEffect, type RefObject } from "react";
import * as THREE from "three";
import type { NpcSystem } from "../world/toys";

type MinimapRemotePet = {
  targetX: number;
  targetZ: number;
};

type MinimapRemoteNpc = {
  targetX: number;
  targetZ: number;
};

export function usePlaygroundMinimap({
  minimapRef,
  spriteRef,
  remotePetsRef,
  npcSystemRef,
  remoteNpcsRef,
  floorHalf
}: {
  minimapRef: RefObject<HTMLCanvasElement | null>;
  spriteRef: RefObject<THREE.Sprite | null>;
  remotePetsRef: RefObject<Map<string, MinimapRemotePet>>;
  npcSystemRef: RefObject<NpcSystem | null>;
  remoteNpcsRef: RefObject<Map<string, MinimapRemoteNpc>>;
  floorHalf: number;
}) {
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    const margin = 6;
    const usable = size - margin * 2;
    const worldExtent = floorHalf * 2;
    function project(x: number, z: number): [number, number] {
      const u = (x + floorHalf) / worldExtent;
      const v = (z + floorHalf) / worldExtent;
      return [margin + u * usable, margin + v * usable];
    }
    function drawDot(x: number, z: number, color: string, radius: number, halo?: string) {
      const [px, py] = project(x, z);
      if (halo) {
        ctx!.fillStyle = halo;
        ctx!.beginPath();
        ctx!.arc(px, py, radius + 2.4, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.arc(px, py, radius, 0, Math.PI * 2);
      ctx!.fill();
    }
    let raf = 0;
    let alive = true;
    function frame() {
      if (!alive) return;
      ctx!.clearRect(0, 0, size, size);
      const own = spriteRef.current;
      if (own) {
        drawDot(own.position.x, own.position.z, "#b15a16", 3.4, "rgba(217, 122, 24, 0.32)");
      }
      for (const r of remotePetsRef.current.values()) {
        drawDot(r.targetX, r.targetZ, "#d8cfb6", 2.8);
      }
      const npcSys = npcSystemRef.current;
      if (npcSys) {
        for (const n of npcSys.list()) {
          drawDot(n.x, n.z, "#3f7f9a", 2.6);
        }
      }
      for (const rn of remoteNpcsRef.current.values()) {
        drawDot(rn.targetX, rn.targetZ, "#3f7f9a", 2.6);
      }
      raf = window.requestAnimationFrame(frame);
    }
    raf = window.requestAnimationFrame(frame);
    return () => {
      alive = false;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [minimapRef, spriteRef, remotePetsRef, npcSystemRef, remoteNpcsRef, floorHalf]);
}
