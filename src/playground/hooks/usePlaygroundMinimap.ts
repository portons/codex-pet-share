import { useEffect, type RefObject } from "react";
import * as THREE from "three";
import { RO_PRONTERA_MINIMAP_PATH } from "../core/roPronteraBiome.generated";
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
    const mapImage = new Image();
    let mapReady = false;
    function project(x: number, z: number): [number, number] {
      const u = (x + floorHalf) / worldExtent;
      const v = (z + floorHalf) / worldExtent;
      return [margin + u * usable, margin + v * usable];
    }
    function drawMap() {
      ctx!.drawImage(mapImage, 0, 0, size, size);
      ctx!.fillStyle = "rgba(22, 18, 10, 0.16)";
      ctx!.fillRect(0, 0, size, size);
      ctx!.strokeStyle = "rgba(255, 239, 188, 0.58)";
      ctx!.lineWidth = 1.2;
      ctx!.strokeRect(6.5, 6.5, size - 13, size - 13);
    }
    function drawDot(x: number, z: number, color: string, radius: number, halo?: string, shape: "circle" | "diamond" = "circle") {
      const [px, py] = project(x, z);
      if (halo) {
        ctx!.fillStyle = halo;
        ctx!.beginPath();
        ctx!.arc(px, py, radius + 2.4, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.fillStyle = color;
      ctx!.strokeStyle = "rgba(39, 29, 17, 0.74)";
      ctx!.lineWidth = 1.2;
      if (shape === "diamond") {
        ctx!.beginPath();
        ctx!.moveTo(px, py - radius);
        ctx!.lineTo(px + radius, py);
        ctx!.lineTo(px, py + radius);
        ctx!.lineTo(px - radius, py);
        ctx!.closePath();
        ctx!.fill();
        ctx!.stroke();
        return;
      }
      ctx!.beginPath();
      ctx!.arc(px, py, radius, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.stroke();
    }
    let raf = 0;
    let alive = true;
    function frame() {
      if (!alive) return;
      ctx!.clearRect(0, 0, size, size);
      if (!mapReady) {
        raf = window.requestAnimationFrame(frame);
        return;
      }
      drawMap();
      const own = spriteRef.current;
      if (own) {
        drawDot(own.position.x, own.position.z, "#f08b24", 4.2, "rgba(255, 210, 112, 0.36)", "diamond");
      }
      for (const r of remotePetsRef.current.values()) {
        drawDot(r.targetX, r.targetZ, "#f8efd2", 3);
      }
      const npcSys = npcSystemRef.current;
      if (npcSys) {
        for (const n of npcSys.list()) {
          drawDot(n.x, n.z, "#4f9dbc", 2.9);
        }
      }
      for (const rn of remoteNpcsRef.current.values()) {
        drawDot(rn.targetX, rn.targetZ, "#4f9dbc", 2.9);
      }
      raf = window.requestAnimationFrame(frame);
    }
    mapImage.onload = () => {
      mapReady = true;
    };
    mapImage.src = RO_PRONTERA_MINIMAP_PATH;
    raf = window.requestAnimationFrame(frame);
    return () => {
      alive = false;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [minimapRef, spriteRef, remotePetsRef, npcSystemRef, remoteNpcsRef, floorHalf]);
}
