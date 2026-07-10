// Optional gamification layer for the 3D playground.
//
// Physics is hand-rolled (sphere-only, no external lib).

import * as THREE from "three";
import { petTextureAssetUrl } from "../../domain/http";
import { canOccupyPlaygroundPosition, clampToPlaygroundFloor } from "../core/collision";
import { petAtlasRowsFromHeight } from "../core/config";

// NPC slot system — up to MAX_NPCS wandering AI pets at once. Each NPC is a
// distinct sprite atlas (different pet) so the user can populate the park.
// ---------------------------------------------------------------------------

export const MAX_NPCS = 2;

const NPC_SPEED = 4.5;
const NPC_WAYPOINT_RADIUS = 0.6;
const NPC_GREET_TRIGGER_DIST = 4;
const NPC_GREET_DURATION_MS = 2400;
const NPC_GREET_COOLDOWN_MS = 6000;
const NPC_SPAWN_RADIUS_SCALE = 0.65;
const NPC_POSITION_ATTEMPTS = 80;
const NPC_STUCK_FRAME_LIMIT = 24;
const NPC_AVOIDANCE_ANGLES = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI * 0.75, -Math.PI * 0.75];

export const NPC_ATLAS_COLS = 8;
export const NPC_ATLAS_ROWS = 9;

export type NpcDef = { row: number; frames: number; fps: number };
export const NPC_DEFS = {
  idle:     { row: 0, frames: 6, fps: 6 } as NpcDef,
  runRight: { row: 1, frames: 8, fps: 12 } as NpcDef,
  runLeft:  { row: 2, frames: 8, fps: 12 } as NpcDef,
  runFwd:   { row: 7, frames: 6, fps: 12 } as NpcDef,
  wave:     { row: 3, frames: 4, fps: 5 } as NpcDef
};

type NpcState = "idle" | "walking" | "greeting";

type Npc = {
  id: string;
  petId: string;
  displayName: string;
  spritesheetUrl: string;
  obj: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  tex: THREE.Texture;
  imgReady: boolean;
  atlasRows: number;
  state: NpcState;
  stateStart: number;
  row: number;
  frames: number;
  fps: number;
  wpX: number;
  wpZ: number;
  pauseAt: number;
  lastGreetEndedAt: number;
  greetUntil: number;
  greetFlip: 1 | -1;
  // Movement velocity from this frame's chosen waypoint vector — exposed
  // to the modal so ball collisions can read NPC kick velocity.
  vx: number;
  vz: number;
  // Vertical physics — only ticks when airborne (e.g., off a trampoline).
  // While onGround, sprite.position.y stays at 0.
  yPos: number;
  yVel: number;
  onGround: boolean;
  bounceCooldownUntil: number;
  stuckFrames: number;
};

// Snapshot exposed to the modal each frame so cross-system effects (ball
// collisions, trampoline detection) can run without coupling NPC to those
// systems directly.
export type NpcSnapshot = {
  id: string;
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  onGround: boolean;
};

export type NpcSystem = {
  add: (pet: { id: string; displayName: string; spritesheetUrl: string }) => string | null;
  remove: (npcId: string) => void;
  clear: () => void;
  list: () => Array<{ id: string; petId: string; displayName: string; spritesheetUrl: string; x: number; z: number }>;
  update: (now: number, dt: number, petPos: THREE.Vector3) => void;
  forEach: (fn: (snap: NpcSnapshot) => void) => void;
  bounce: (npcId: string, yVel: number, now: number) => void;
  dispose: () => void;
};

export function makeNpcSystem(
  scene: THREE.Scene,
  floorHalf: number,
  spriteWidth: number,
  spriteHeight: number
): NpcSystem {
  const npcs: Npc[] = [];
  let nextId = 1;
  const moveLimit = floorHalf - spriteWidth / 2;

  function randomWalkablePoint(radiusScale = 1): { x: number; z: number } | null {
    const span = (floorHalf - 3) * radiusScale;
    for (let attempt = 0; attempt < NPC_POSITION_ATTEMPTS; attempt += 1) {
      const x = clampToPlaygroundFloor((Math.random() - 0.5) * span * 2, moveLimit);
      const z = clampToPlaygroundFloor((Math.random() - 0.5) * span * 2, moveLimit);
      if (canOccupyPlaygroundPosition(x, z)) {
        return { x, z };
      }
    }
    return null;
  }

  function randomWalkableSpawnPoint(): { x: number; z: number } | null {
    const radius = floorHalf * NPC_SPAWN_RADIUS_SCALE;
    for (let attempt = 0; attempt < NPC_POSITION_ATTEMPTS; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const x = clampToPlaygroundFloor(Math.cos(angle) * radius, moveLimit);
      const z = clampToPlaygroundFloor(Math.sin(angle) * radius, moveLimit);
      if (canOccupyPlaygroundPosition(x, z)) {
        return { x, z };
      }
    }
    return null;
  }

  function pickWaypoint(n: Npc) {
    const next = randomWalkablePoint();
    if (!next) return false;
    n.wpX = next.x;
    n.wpZ = next.z;
    return true;
  }

  function setState(n: Npc, next: NpcState, now: number) {
    if (next === n.state) return;
    n.state = next;
    n.stateStart = now;
    if (next === "idle") {
      n.row = NPC_DEFS.idle.row; n.frames = NPC_DEFS.idle.frames; n.fps = NPC_DEFS.idle.fps;
    } else if (next === "greeting") {
      n.row = NPC_DEFS.wave.row; n.frames = NPC_DEFS.wave.frames; n.fps = NPC_DEFS.wave.fps;
    }
  }

  function add(pet: { id: string; displayName: string; spritesheetUrl: string }): string | null {
    if (npcs.length >= MAX_NPCS) return null;
    if (npcs.some((n) => n.petId === pet.id)) return null; // no duplicates
    const spritesheetUrl = petTextureAssetUrl(pet.spritesheetUrl);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.repeat.set(1 / NPC_ATLAS_COLS, 1 / NPC_ATLAS_ROWS);

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.05,
      fog: true
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(spriteWidth, spriteHeight, 1);
    sprite.center.set(0.5, 0);
    sprite.visible = false;
    // Spawn away from the center without starting inside blocked geometry.
    const spawnPoint = randomWalkableSpawnPoint();
    if (!spawnPoint) return null;
    sprite.position.set(spawnPoint.x, 0, spawnPoint.z);
    scene.add(sprite);

    const npc: Npc = {
      id: `npc-${nextId++}`,
      petId: pet.id,
      displayName: pet.displayName,
      spritesheetUrl,
      obj: sprite,
      mat,
      tex,
      imgReady: false,
      atlasRows: NPC_ATLAS_ROWS,
      state: "idle",
      stateStart: performance.now(),
      row: NPC_DEFS.idle.row,
      frames: NPC_DEFS.idle.frames,
      fps: NPC_DEFS.idle.fps,
      wpX: 0,
      wpZ: 0,
      pauseAt: 0,
      lastGreetEndedAt: -Infinity,
      greetUntil: 0,
      greetFlip: 1,
      vx: 0,
      vz: 0,
      yPos: 0,
      yVel: 0,
      onGround: true,
      bounceCooldownUntil: 0,
      stuckFrames: 0
    };
    if (!pickWaypoint(npc)) {
      scene.remove(sprite);
      mat.dispose();
      tex.dispose();
      return null;
    }
    img.onload = () => {
      npc.atlasRows = petAtlasRowsFromHeight(img.naturalHeight);
      tex.repeat.y = 1 / npc.atlasRows;
      npc.imgReady = true;
      tex.needsUpdate = true;
      sprite.visible = true;
    };
    img.onerror = () => {
      // Silent fail — sprite stays invisible. Caller sees no growth.
    };
    img.src = spritesheetUrl;
    npcs.push(npc);
    return npc.id;
  }

  function remove(npcId: string) {
    const idx = npcs.findIndex((n) => n.id === npcId);
    if (idx < 0) return;
    const n = npcs[idx];
    scene.remove(n.obj);
    n.mat.dispose();
    n.tex.dispose();
    npcs.splice(idx, 1);
  }

  function list() {
    return npcs.map((n) => ({
      id: n.id,
      petId: n.petId,
      displayName: n.displayName,
      spritesheetUrl: n.spritesheetUrl,
      x: n.obj.position.x,
      z: n.obj.position.z
    }));
  }

  function update(now: number, dt: number, petPos: THREE.Vector3) {
    for (const n of npcs) {
      if (!n.imgReady) continue;

      const distPlayer = Math.hypot(n.obj.position.x - petPos.x, n.obj.position.z - petPos.z);
      if (
        n.state !== "greeting"
        && n.onGround
        && distPlayer < NPC_GREET_TRIGGER_DIST
        && now - n.lastGreetEndedAt > NPC_GREET_COOLDOWN_MS
      ) {
        setState(n, "greeting", now);
        n.greetUntil = now + NPC_GREET_DURATION_MS;
        n.greetFlip = (petPos.x - n.obj.position.x) >= 0 ? 1 : -1;
      }
      if (n.state === "greeting" && now >= n.greetUntil) {
        setState(n, "idle", now);
        n.lastGreetEndedAt = now;
        n.pauseAt = now + 600 + Math.random() * 400;
      }

      // Reset per-frame velocity then integrate movement.
      n.vx = 0;
      n.vz = 0;

      if (n.state !== "greeting") {
        const dxw = n.wpX - n.obj.position.x;
        const dzw = n.wpZ - n.obj.position.z;
        const d = Math.hypot(dxw, dzw);
        if (d < NPC_WAYPOINT_RADIUS) {
          if (n.state !== "idle") {
            setState(n, "idle", now);
            n.pauseAt = now + 800 + Math.random() * 1600;
          }
          if (now >= n.pauseAt && n.onGround) {
            if (pickWaypoint(n)) {
              setState(n, "walking", now);
            }
          }
        } else {
          if (n.state !== "walking") setState(n, "walking", now);
          const inv = 1 / d;
          const nx = dxw * inv;
          const nz = dzw * inv;
          moveNpc(n, nx, nz, dt, now);
          if (n.state === "walking") {
            if (nx > 0.3) { n.row = NPC_DEFS.runRight.row; n.frames = NPC_DEFS.runRight.frames; n.fps = NPC_DEFS.runRight.fps; }
            else if (nx < -0.3) { n.row = NPC_DEFS.runLeft.row; n.frames = NPC_DEFS.runLeft.frames; n.fps = NPC_DEFS.runLeft.fps; }
            else { n.row = NPC_DEFS.runFwd.row; n.frames = NPC_DEFS.runFwd.frames; n.fps = NPC_DEFS.runFwd.fps; }
          }
        }
      }

      // Vertical physics — gravity only when airborne.
      if (!n.onGround) {
        n.yVel -= 16 * dt; // slightly gentler than the player's GRAVITY for cuter arcs
        n.yPos += n.yVel * dt;
        if (n.yPos <= 0) {
          n.yPos = 0;
          n.yVel = 0;
          n.onGround = true;
        }
      }
      n.obj.position.y = n.yPos;

      const elapsed = (now - n.stateStart) / 1000;
      const rawFrame = elapsed * n.fps;
      const frameIdx = Math.floor(rawFrame) % n.frames;
      const flip = n.state === "greeting" ? n.greetFlip : 1;
      if (flip === -1) {
        n.tex.repeat.x = -1 / NPC_ATLAS_COLS;
        n.tex.offset.x = (frameIdx + 1) / NPC_ATLAS_COLS;
      } else {
        n.tex.repeat.x = 1 / NPC_ATLAS_COLS;
        n.tex.offset.x = frameIdx / NPC_ATLAS_COLS;
      }
      n.tex.offset.y = (n.atlasRows - 1 - n.row) / n.atlasRows;
    }
  }

  function moveNpc(n: Npc, nx: number, nz: number, dt: number, now: number) {
    const currentX = n.obj.position.x;
    const currentZ = n.obj.position.z;
    const currentDistance = Math.hypot(n.wpX - currentX, n.wpZ - currentZ);
    const step = NPC_SPEED * dt;
    let bestX = currentX;
    let bestZ = currentZ;
    let bestScore = -Infinity;

    for (const angle of NPC_AVOIDANCE_ANGLES) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dirX = nx * cos - nz * sin;
      const dirZ = nx * sin + nz * cos;
      const targetX = clampToPlaygroundFloor(currentX + dirX * step, moveLimit);
      const targetZ = clampToPlaygroundFloor(currentZ + dirZ * step, moveLimit);
      if (!canOccupyPlaygroundPosition(targetX, targetZ)) continue;

      const nextDistance = Math.hypot(n.wpX - targetX, n.wpZ - targetZ);
      const score = currentDistance - nextDistance - Math.abs(angle) * 0.02;
      if (score > bestScore) {
        bestScore = score;
        bestX = targetX;
        bestZ = targetZ;
      }
    }

    n.obj.position.x = bestX;
    n.obj.position.z = bestZ;
    n.vx = dt > 0 ? (bestX - currentX) / dt : 0;
    n.vz = dt > 0 ? (bestZ - currentZ) / dt : 0;

    const moved = Math.hypot(bestX - currentX, bestZ - currentZ);
    n.stuckFrames = moved > 0.01 && bestScore > 0.01 ? 0 : n.stuckFrames + 1;

    if (n.stuckFrames >= NPC_STUCK_FRAME_LIMIT) {
      n.stuckFrames = 0;
      setState(n, "idle", now);
      n.pauseAt = now + 300 + Math.random() * 500;
      pickWaypoint(n);
    }
  }

  function forEach(fn: (snap: NpcSnapshot) => void) {
    for (const n of npcs) {
      if (!n.imgReady) continue;
      fn({
        id: n.id,
        x: n.obj.position.x,
        z: n.obj.position.z,
        y: n.yPos,
        vx: n.vx,
        vz: n.vz,
        onGround: n.onGround
      });
    }
  }

  function bounce(npcId: string, yVel: number, now: number) {
    const n = npcs.find((x) => x.id === npcId);
    if (!n) return;
    if (now < n.bounceCooldownUntil) return;
    n.yVel = yVel;
    n.yPos = Math.max(0.05, n.yPos);
    n.onGround = false;
    n.bounceCooldownUntil = now + 250; // prevents pad-edge re-bounce double-fire
  }

  function clearNpcs() {
    for (const n of npcs) {
      scene.remove(n.obj);
      n.mat.dispose();
      n.tex.dispose();
    }
    npcs.length = 0;
  }

  return { add, remove, clear: clearNpcs, list, update, forEach, bounce, dispose: clearNpcs };
}
