// Optional gamification layer for the 3D playground. Each system is a
// self-contained factory the modal owns; everything here disposes its own
// scene resources on teardown.
//
// Physics is hand-rolled (sphere-only, no external lib).

import * as THREE from "three";
import { colourForBallId, paintBallTexture } from "./ballAppearance";
import {
  BALL_RADIUS_DEFAULT,
  type Ball,
  type BallActor,
  type BallSnapshot,
  type BallSystem
} from "./ballTypes";
import { updateBallPhysics } from "./ballPhysics";

// ---------------------------------------------------------------------------
// Sphere physics — balls with rolling visual, ground, walls, ball-ball,
// ball-pet (capsule).
// ---------------------------------------------------------------------------

export type { BallActor, BallSnapshot, BallSystem } from "./ballTypes";
export { PET_COLLIDE_HEIGHT, PET_COLLIDE_RADIUS } from "./ballTypes";

export function makeBallSystem(scene: THREE.Scene): BallSystem {
  const balls: Ball[] = [];
  let localSeq = 0;
  const rollDelta = new THREE.Quaternion();
  const rollAxis = new THREE.Vector3();

  function disposeBall(b: Ball) {
    scene.remove(b.obj);
    scene.remove(b.shadow);
    b.geom.dispose();
    b.mat.dispose();
    b.tex.dispose();
    b.shadowGeom.dispose();
    b.shadowMat.dispose();
  }

  function pruneOldest() {
    if (balls.length <= 24) return;
    const oldest = balls.shift()!;
    disposeBall(oldest);
  }

  function buildBall(
    id: string,
    ownerId: string,
    simulated: boolean,
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    radius: number
  ): Ball {
    const colour = colourForBallId(id);
    const geom = new THREE.SphereGeometry(radius, 24, 18);
    const tex = paintBallTexture(colour);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.05
    });
    const obj = new THREE.Mesh(geom, mat);
    obj.position.copy(pos);
    scene.add(obj);
    // Ground shadow disc — fakes contact + gives the eye a fixed reference
    // for ball height. Same trick the pet uses.
    const shadowGeom = new THREE.CircleGeometry(radius * 0.95, 18);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: "#10100f",
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeom, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(pos.x, 0.02, pos.z);
    scene.add(shadow);
    return {
      id,
      ownerId,
      simulated,
      obj,
      mat,
      geom,
      tex,
      shadow,
      shadowMat,
      shadowGeom,
      pos,
      vel,
      radius,
      quat: new THREE.Quaternion()
    };
  }

  function spawnAt(
    id: string,
    ownerId: string,
    origin: THREE.Vector3,
    facingX: number,
    facingZ: number,
    sprinting: boolean,
    simulated: boolean
  ) {
    const radius = BALL_RADIUS_DEFAULT * (0.85 + Math.random() * 0.35);
    const ahead = sprinting ? 1.4 : 1.0;
    const pos = new THREE.Vector3(
      origin.x + facingX * ahead,
      radius + 1.4,
      origin.z + facingZ * ahead
    );
    const speed = sprinting ? 7.5 : 5.0;
    const vel = new THREE.Vector3(facingX * speed, 4.5, facingZ * speed);
    balls.push(buildBall(id, ownerId, simulated, pos, vel, radius));
    pruneOldest();
  }

  function spawn(origin: THREE.Vector3, facingX: number, facingZ: number, sprinting: boolean) {
    const id = `local-${++localSeq}`;
    spawnAt(id, "local", origin, facingX, facingZ, sprinting, true);
  }

  function spawnWithId(
    id: string,
    ownerId: string,
    origin: THREE.Vector3,
    facingX: number,
    facingZ: number,
    sprinting: boolean
  ) {
    if (balls.some((b) => b.id === id)) return;
    spawnAt(id, ownerId, origin, facingX, facingZ, sprinting, true);
  }

  function addRemote(id: string, ownerId: string, x: number, y: number, z: number) {
    if (balls.some((b) => b.id === id)) return;
    const radius = BALL_RADIUS_DEFAULT;
    balls.push(
      buildBall(id, ownerId, false, new THREE.Vector3(x, y, z), new THREE.Vector3(), radius)
    );
    pruneOldest();
  }

  function applySnapshot(snap: BallSnapshot) {
    const b = balls.find((x) => x.id === snap.id);
    if (!b) {
      addRemote(snap.id, snap.ownerId, snap.x, snap.y, snap.z);
      return;
    }
    b.pos.set(snap.x, snap.y, snap.z);
    b.vel.set(snap.vx, snap.vy, snap.vz);
  }

  function snapshot(): BallSnapshot[] {
    const out: BallSnapshot[] = [];
    for (const b of balls) {
      if (!b.simulated) continue;
      out.push({
        id: b.id,
        ownerId: b.ownerId,
        x: b.pos.x,
        y: b.pos.y,
        z: b.pos.z,
        vx: b.vel.x,
        vy: b.vel.y,
        vz: b.vel.z
      });
    }
    return out;
  }

  function removeById(id: string) {
    const idx = balls.findIndex((b) => b.id === id);
    if (idx < 0) return;
    disposeBall(balls[idx]);
    balls.splice(idx, 1);
  }

  function removeByOwner(ownerId: string) {
    for (let i = balls.length - 1; i >= 0; i -= 1) {
      if (balls[i].ownerId === ownerId) {
        disposeBall(balls[i]);
        balls.splice(i, 1);
      }
    }
  }

  function countForOwner(ownerId: string): number {
    let n = 0;
    for (const b of balls) if (b.ownerId === ownerId) n += 1;
    return n;
  }

  function removeOldestForOwner(ownerId: string) {
    // `balls` is appended on spawn, so the lowest matching index is the
    // oldest ball this owner still has on the floor. Drop that one.
    for (let i = 0; i < balls.length; i += 1) {
      if (balls[i].ownerId === ownerId) {
        disposeBall(balls[i]);
        balls.splice(i, 1);
        return;
      }
    }
  }

  function update(dt: number, actors: BallActor[], floorHalf: number) {
    updateBallPhysics({ balls, actors, floorHalf, dt, rollDelta, rollAxis });
  }

  function clear() {
    for (const b of balls) {
      disposeBall(b);
    }
    balls.length = 0;
  }

  return {
    spawn,
    spawnWithId,
    addRemote,
    applySnapshot,
    snapshot,
    removeById,
    removeByOwner,
    countForOwner,
    removeOldestForOwner,
    update,
    clear,
    count: () => balls.length,
    dispose: clear
  };
}

// ---------------------------------------------------------------------------
// Trampoline pad — placeable disc; pet landing on it gets boosted jump.
// ---------------------------------------------------------------------------
