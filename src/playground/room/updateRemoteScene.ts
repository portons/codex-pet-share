import * as THREE from "three";
import { applyAtlasFrame, remotePetFrame } from "../animation";
import {
  AFTERIMAGE_SPAWN_INTERVAL,
  GRAVITY,
  REMOTE_PET_LERP,
  SPRITE_HEIGHT,
  STREAK_SPAWN_INTERVAL
} from "../core/config";
import { NPC_ATLAS_COLS, NPC_DEFS } from "../world/toys";
import { positionAnchor } from "./roomOverlay";
import type { RemoteNpc, RemotePet } from "./remoteActors";
import type { RoomMode } from "./types";

type DustEmitter = (
  x: number,
  z: number,
  count: number,
  opts?: { vScale?: number; sizeScale?: number; life?: number; yStart?: number }
) => void;

export function updateRemoteScene({
  roomMode,
  remotePets,
  remoteNpcs,
  now,
  dt,
  camera,
  renderer,
  localSprite,
  overlayLayer,
  spawnAfterImageFor,
  spawnSprintStreaks,
  spawnDust
}: {
  roomMode: RoomMode;
  remotePets: Map<string, RemotePet>;
  remoteNpcs: Map<string, RemoteNpc>;
  now: number;
  dt: number;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  localSprite: THREE.Sprite;
  overlayLayer: HTMLDivElement | null;
  spawnAfterImageFor: ((sourceSprite: THREE.Sprite, sourceTex: THREE.Texture) => void) | null;
  spawnSprintStreaks: ((fromX: number, fromZ: number, worldDirX: number, worldDirZ: number, runSpeed: number) => void) | null;
  spawnDust: DustEmitter | null;
}) {
  for (const remote of remotePets.values()) {
    if (!remote.imgReady) {
      if (remote.loadingOrb) {
        remote.loadingOrb.position.set(remote.targetX, remote.targetY + SPRITE_HEIGHT * 0.35, remote.targetZ);
        const pulse = 0.85 + 0.12 * Math.sin(now * 0.006);
        (remote.loadingOrb.material as THREE.SpriteMaterial).opacity = pulse;
      }
      continue;
    }

    const sprite = remote.sprite;
    const dtSnap = Math.min(0.25, (now - remote.targetTime) / 1000);
    const extrapX = remote.targetX + remote.vx * dtSnap;
    const extrapZ = remote.targetZ + remote.vz * dtSnap;
    const extrapY = Math.max(0, remote.targetY + remote.vy * dtSnap - 0.5 * GRAVITY * dtSnap * dtSnap);
    sprite.position.x += (extrapX - sprite.position.x) * REMOTE_PET_LERP;
    sprite.position.y += (extrapY - sprite.position.y) * REMOTE_PET_LERP;
    sprite.position.z += (extrapZ - sprite.position.z) * REMOTE_PET_LERP;
    sprite.scale.set(remote.scaleX, remote.scaleY, 1);
    applyAtlasFrame(remote.tex, remote.row, remotePetFrame(remote.row, remote.frame, remote.rowStart, remote.sprinting, now), {
      rows: remote.atlasRows
    });

    const remoteOnGround = sprite.position.y <= 0.05;
    const remoteSpeed = Math.hypot(remote.vx, remote.vz);
    if (remote.sprinting && remoteOnGround && remoteSpeed > 0.05) {
      const dirNorm = remoteSpeed > 0.001 ? remoteSpeed : 1;
      const worldDirX = remote.vx / dirNorm;
      const worldDirZ = remote.vz / dirNorm;
      remote.afterImageTimer += dt;
      if (remote.afterImageTimer >= AFTERIMAGE_SPAWN_INTERVAL) {
        remote.afterImageTimer = 0;
        spawnAfterImageFor?.(sprite, remote.tex);
      }
      remote.streakTimer += dt;
      while (remote.streakTimer >= STREAK_SPAWN_INTERVAL) {
        remote.streakTimer -= STREAK_SPAWN_INTERVAL;
        spawnSprintStreaks?.(sprite.position.x, sprite.position.z, worldDirX, worldDirZ, remoteSpeed);
      }
      remote.footstepTimer += dt;
      if (remote.footstepTimer >= 0.18) {
        remote.footstepTimer = 0;
        spawnDust?.(sprite.position.x, sprite.position.z, 2, { vScale: 0.4, sizeScale: 0.55, life: 0.22, yStart: 0.08 });
      }
    } else {
      remote.streakTimer = 0;
      remote.afterImageTimer = 0;
      remote.footstepTimer = 0;
    }
  }

  const renderRemoteNpcs = roomMode.kind === "guest" || !!roomMode.isPermanent;
  if (renderRemoteNpcs) {
    for (const remote of remoteNpcs.values()) {
      if (!remote.imgReady) {
        if (remote.loadingOrb) {
          remote.loadingOrb.position.set(remote.targetX, remote.targetY + SPRITE_HEIGHT * 0.35, remote.targetZ);
          const pulse = 0.85 + 0.12 * Math.sin(now * 0.006);
          (remote.loadingOrb.material as THREE.SpriteMaterial).opacity = pulse;
        }
        continue;
      }

      const sprite = remote.sprite;
      const dtSnap = Math.min(0.25, (now - remote.targetTime) / 1000);
      const extrapX = remote.targetX + remote.vx * dtSnap;
      const extrapZ = remote.targetZ + remote.vz * dtSnap;
      sprite.position.x += (extrapX - sprite.position.x) * REMOTE_PET_LERP;
      sprite.position.y += (remote.targetY - sprite.position.y) * REMOTE_PET_LERP;
      sprite.position.z += (extrapZ - sprite.position.z) * REMOTE_PET_LERP;

      const speed = Math.hypot(remote.vx, remote.vz);
      let nextDef: typeof NPC_DEFS["idle"];
      if (speed < 0.1) nextDef = NPC_DEFS.idle;
      else if (remote.vx > 0.3) nextDef = NPC_DEFS.runRight;
      else if (remote.vx < -0.3) nextDef = NPC_DEFS.runLeft;
      else nextDef = NPC_DEFS.runFwd;
      if (nextDef.row !== remote.row) {
        remote.row = nextDef.row;
        remote.frames = nextDef.frames;
        remote.fps = nextDef.fps;
        remote.rowStart = now;
      }
      const elapsed = (now - remote.rowStart) / 1000;
      const frameIdx = Math.floor(elapsed * remote.fps) % remote.frames;
      applyAtlasFrame(remote.tex, remote.row, frameIdx, { columns: NPC_ATLAS_COLS, rows: remote.atlasRows });
    }
  }

  camera.updateMatrixWorld(true);
  if (!overlayLayer) return;

  const ownAnchor = overlayLayer.querySelector<HTMLElement>(`[data-userid="${roomMode.ownUserId}"]`);
  if (ownAnchor) {
    positionAnchor(ownAnchor, localSprite, camera, renderer);
  }
  for (const remote of remotePets.values()) {
    if (!remote.imgReady) continue;
    const node = overlayLayer.querySelector<HTMLElement>(`[data-userid="${remote.userId}"]`);
    if (node) positionAnchor(node, remote.sprite, camera, renderer);
  }
}
