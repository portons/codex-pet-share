import type * as THREE from "three";
import { POS_BROADCAST_INTERVAL_MS } from "../core/config";
import { PetSpriteAnimator } from "../animation";
import type { BallSystem, NpcSystem } from "../world/toys";
import { broadcastNpcSnapshot } from "./npcBroadcast";
import type { RoomMode } from "./types";

export function broadcastRoomFrame({
  roomMode,
  now,
  lastPosBroadcastAt,
  animator,
  sprinting,
  sprite,
  petVelX,
  petVelZ,
  ballsSystem,
  npcSystem
}: {
  roomMode: RoomMode;
  now: number;
  lastPosBroadcastAt: number;
  animator: PetSpriteAnimator;
  sprinting: boolean;
  sprite: THREE.Sprite;
  petVelX: number;
  petVelZ: number;
  ballsSystem: BallSystem | null;
  npcSystem: NpcSystem | null;
}) {
  if (now - lastPosBroadcastAt < POS_BROADCAST_INTERVAL_MS) return lastPosBroadcastAt;

  const broadcastFrame = animator.broadcastFrame(now, sprinting);
  roomMode.channel.broadcastPos({
    userId: roomMode.ownUserId,
    x: sprite.position.x,
    y: sprite.position.y,
    z: sprite.position.z,
    yaw: 0,
    scaleX: sprite.scale.x,
    scaleY: sprite.scale.y,
    vx: petVelX,
    vy: animator.yVel,
    vz: petVelZ,
    row: broadcastFrame.row,
    frame: broadcastFrame.frame,
    sprinting: broadcastFrame.sprinting
  });
  if (roomMode.kind === "host" && ballsSystem) {
    roomMode.channel.broadcastBallState({
      balls: ballsSystem.snapshot()
    });
  }
  const broadcastsNpcs = !!roomMode.isPermanent || roomMode.kind === "host";
  if (broadcastsNpcs && npcSystem) {
    broadcastNpcSnapshot(roomMode, npcSystem, { includeEmpty: true });
  }
  return now;
}
