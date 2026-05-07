import type * as THREE from "three";
import {
  PET_COLLIDE_HEIGHT,
  PET_COLLIDE_RADIUS,
  type BallActor,
  type NpcSystem
} from "./toys";
import type { RemotePet } from "../room/remoteActors";
import type { RoomMode } from "../room/types";

export function collectBallActors({
  sprite,
  moving,
  worldDx,
  worldDz,
  runSpeed,
  npcSystem,
  roomMode,
  remotePets
}: {
  sprite: THREE.Sprite;
  moving: boolean;
  worldDx: number;
  worldDz: number;
  runSpeed: number;
  npcSystem: NpcSystem | null;
  roomMode?: RoomMode;
  remotePets: Map<string, RemotePet>;
}): BallActor[] {
  const petVelX = moving ? worldDx * runSpeed : 0;
  const petVelZ = moving ? worldDz * runSpeed : 0;
  const actors: BallActor[] = [{
    x: sprite.position.x,
    z: sprite.position.z,
    y: sprite.position.y,
    vx: petVelX,
    vz: petVelZ,
    radius: PET_COLLIDE_RADIUS,
    height: PET_COLLIDE_HEIGHT
  }];
  if (npcSystem) {
    npcSystem.forEach((s) => {
      actors.push({
        x: s.x,
        z: s.z,
        y: s.y,
        vx: s.vx,
        vz: s.vz,
        radius: PET_COLLIDE_RADIUS,
        height: PET_COLLIDE_HEIGHT
      });
    });
  }
  if (roomMode?.kind === "host") {
    for (const remote of remotePets.values()) {
      actors.push({
        x: remote.targetX,
        z: remote.targetZ,
        y: remote.targetY,
        vx: remote.vx,
        vz: remote.vz,
        radius: PET_COLLIDE_RADIUS,
        height: PET_COLLIDE_HEIGHT
      });
    }
  }
  return actors;
}
