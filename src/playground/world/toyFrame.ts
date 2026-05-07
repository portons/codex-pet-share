import * as THREE from "three";
import {
  BALL_SPAWN_COOLDOWN_MS,
  COLLECTION_PAD_CAP,
  FLOOR_HALF,
  GUEST_PAD_CAP,
  PAD_PLACE_COOLDOWN_MS
} from "../core/config";
import type { RemotePet } from "../room/remoteActors";
import type { RoomMode } from "../room/types";
import { collectBallActors } from "./ballActors";
import type { BallSystem, NpcSystem, TrampolineSystem } from "./toys";

export function handleBallSpawnInput({
  pressed,
  now,
  lastBallSpawnAt,
  ballsSystem,
  roomMode,
  sprite,
  moving,
  worldDx,
  worldDz,
  sprinting,
  jumpFacing
}: {
  pressed: Set<string>;
  now: number;
  lastBallSpawnAt: number;
  ballsSystem: BallSystem | null;
  roomMode?: RoomMode;
  sprite: THREE.Sprite;
  moving: boolean;
  worldDx: number;
  worldDz: number;
  sprinting: boolean;
  jumpFacing: 1 | -1;
}) {
  if (!pressed.has("KeyB") || !ballsSystem) return lastBallSpawnAt;
  pressed.delete("KeyB");
  if (now - lastBallSpawnAt < BALL_SPAWN_COOLDOWN_MS) return lastBallSpawnAt;

  const fx = moving ? worldDx : (jumpFacing === -1 ? -1 : 1);
  const fz = moving ? worldDz : 0;
  if (roomMode?.kind === "guest") {
    roomMode.channel.broadcastBallSpawnRequest({
      requesterId: roomMode.ownUserId,
      origin: { x: sprite.position.x, y: sprite.position.y, z: sprite.position.z },
      fx,
      fz,
      sprinting
    });
  } else if (roomMode?.kind === "host") {
    const id = `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    ballsSystem.spawnWithId(id, roomMode.hostUserId, sprite.position, fx, fz, sprinting);
  } else {
    ballsSystem.spawn(sprite.position, fx, fz, sprinting);
  }
  return now;
}

export function handleTrampolinePlaceInput({
  pressed,
  now,
  lastPadPlaceAt,
  trampSystem,
  roomMode,
  sprite
}: {
  pressed: Set<string>;
  now: number;
  lastPadPlaceAt: number;
  trampSystem: TrampolineSystem | null;
  roomMode?: RoomMode;
  sprite: THREE.Sprite;
}) {
  if (!pressed.has("KeyT") || !trampSystem) return lastPadPlaceAt;
  pressed.delete("KeyT");
  if (now - lastPadPlaceAt < PAD_PLACE_COOLDOWN_MS) return lastPadPlaceAt;

  const tx = sprite.position.x;
  const tz = sprite.position.z;
  const ownerId = roomMode?.ownUserId;
  const padCap = roomMode?.isPermanent ? COLLECTION_PAD_CAP : GUEST_PAD_CAP;
  const enforcePadCap = roomMode && (roomMode.isPermanent || roomMode.kind === "guest");
  if (enforcePadCap) {
    while ((trampSystem.countForOwner(roomMode.ownUserId) ?? 0) >= padCap) {
      trampSystem.removeOldestForOwner(roomMode.ownUserId);
    }
  }
  trampSystem.place(tx, tz, ownerId);
  if (roomMode) {
    roomMode.channel.broadcastWorldDiff({
      kind: "tramp:add",
      payload: {
        id: `${tx.toFixed(2)}_${tz.toFixed(2)}_${Date.now()}`,
        x: tx,
        z: tz,
        ownerId: roomMode.ownUserId
      }
    });
  }
  return now;
}

export function handleLocalTrampolineBounce({
  now,
  trampSystem,
  sprite,
  animator
}: {
  now: number;
  trampSystem: TrampolineSystem | null;
  sprite: THREE.Sprite;
  animator: {
    onGround: boolean;
    isLandingSquashActive: (now: number) => boolean;
    launchFromTrampoline: (yVel: number, now: number) => void;
  };
}) {
  if (
    trampSystem
    && trampSystem.hasPad()
    && animator.onGround
    && animator.isLandingSquashActive(now)
    && trampSystem.isOver(sprite.position.x, sprite.position.z)
  ) {
    animator.launchFromTrampoline(trampSystem.autoBounceVel, now);
    trampSystem.bounceTrigger(sprite.position.x, sprite.position.z);
  }
}

export function updateNpcToyFrame({
  now,
  dt,
  sprite,
  npcSystem,
  trampSystem,
  npcWasOverPad
}: {
  now: number;
  dt: number;
  sprite: THREE.Sprite;
  npcSystem: NpcSystem | null;
  trampSystem: TrampolineSystem | null;
  npcWasOverPad: Map<string, boolean>;
}) {
  if (!npcSystem) return;
  npcSystem.update(now, dt, sprite.position);
  if (!trampSystem) return;

  const seen = new Set<string>();
  npcSystem.forEach((npc) => {
    seen.add(npc.id);
    const over = trampSystem.isOver(npc.x, npc.z);
    const wasOver = npcWasOverPad.get(npc.id) ?? false;
    if (over && !wasOver && npc.onGround) {
      npcSystem.bounce(npc.id, trampSystem.autoBounceVel, now);
      trampSystem.bounceTrigger(npc.x, npc.z);
    }
    npcWasOverPad.set(npc.id, over);
  });
  for (const id of npcWasOverPad.keys()) {
    if (!seen.has(id)) npcWasOverPad.delete(id);
  }
}

export function updateBallToyFrame({
  dt,
  sprite,
  moving,
  worldDx,
  worldDz,
  runSpeed,
  npcSystem,
  ballsSystem,
  roomMode,
  remotePets
}: {
  dt: number;
  sprite: THREE.Sprite;
  moving: boolean;
  worldDx: number;
  worldDz: number;
  runSpeed: number;
  npcSystem: NpcSystem | null;
  ballsSystem: BallSystem | null;
  roomMode?: RoomMode;
  remotePets: Map<string, RemotePet>;
}) {
  if (!ballsSystem) return;
  ballsSystem.update(
    dt,
    collectBallActors({ sprite, moving, worldDx, worldDz, runSpeed, npcSystem, roomMode, remotePets }),
    FLOOR_HALF
  );
}
