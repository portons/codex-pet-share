import * as THREE from "three";
import { petTextureAssetUrl } from "../../domain/http";
import type { RoomPresence } from "../../realtime/roomChannel";
import {
  ATLAS_COLS,
  ATLAS_ROWS,
  petAtlasRowsFromHeight,
  SPRITE_HEIGHT,
  SPRITE_WIDTH
} from "../core/config";
import { NPC_ATLAS_COLS, NPC_ATLAS_ROWS, NPC_DEFS } from "../world/toys";
import type { RemoteNpc, RemotePet } from "./remoteActors";

export function ensureRemotePet({
  presence,
  ownUserId,
  scene,
  loadingOrbTexture,
  remotePets
}: {
  presence: RoomPresence;
  ownUserId: string;
  scene: THREE.Scene;
  loadingOrbTexture: THREE.Texture | null;
  remotePets: Map<string, RemotePet>;
}) {
  if (presence.userId === ownUserId) return null;
  let r = remotePets.get(presence.userId);
  if (r) return r;
  const spritesheetUrl = petTextureAssetUrl(presence.spritesheetUrl);
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
  tex.repeat.set(1 / ATLAS_COLS, 1 / ATLAS_ROWS);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.05,
    fog: true
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(SPRITE_WIDTH, SPRITE_HEIGHT, 1);
  sprite.center.set(0.5, 0);
  sprite.visible = false;
  sprite.position.set(0, 0, 0);
  scene.add(sprite);

  let loadingOrb: THREE.Sprite | null = null;
  if (loadingOrbTexture) {
    const orbMat = new THREE.SpriteMaterial({
      map: loadingOrbTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
      fog: false
    });
    loadingOrb = new THREE.Sprite(orbMat);
    loadingOrb.scale.set(SPRITE_WIDTH * 0.7, SPRITE_WIDTH * 0.7, 1);
    loadingOrb.center.set(0.5, 0);
    loadingOrb.position.set(0, SPRITE_HEIGHT * 0.35, 0);
    scene.add(loadingOrb);
  }

  const spawnNow = performance.now();
  const next: RemotePet = {
    userId: presence.userId,
    displayName: presence.displayName,
    petDisplayName: presence.petDisplayName,
    spritesheetUrl,
    sprite,
    mat,
    tex,
    imgReady: false,
    atlasRows: ATLAS_ROWS,
    loadingOrb,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    targetTime: spawnNow,
    spawnTime: spawnNow,
    scaleX: SPRITE_WIDTH,
    scaleY: SPRITE_HEIGHT,
    vx: 0,
    vy: 0,
    vz: 0,
    row: 0,
    frame: 0,
    rowStart: performance.now(),
    sprinting: false,
    streakTimer: 0,
    afterImageTimer: 0,
    footstepTimer: 0
  };
  img.onload = () => {
    next.atlasRows = petAtlasRowsFromHeight(img.naturalHeight);
    tex.repeat.y = 1 / next.atlasRows;
    next.imgReady = true;
    tex.needsUpdate = true;
    sprite.visible = true;
    if (next.loadingOrb) {
      scene.remove(next.loadingOrb);
      (next.loadingOrb.material as THREE.SpriteMaterial).dispose();
      next.loadingOrb = null;
    }
  };
  img.onerror = () => { /* silent */ };
  img.src = spritesheetUrl;
  remotePets.set(presence.userId, next);
  return next;
}

export function dropRemotePet({
  userId,
  scene,
  remotePets
}: {
  userId: string;
  scene: THREE.Scene;
  remotePets: Map<string, RemotePet>;
}) {
  const r = remotePets.get(userId);
  if (!r) return;
  scene.remove(r.sprite);
  r.mat.dispose();
  r.tex.dispose();
  if (r.loadingOrb) {
    scene.remove(r.loadingOrb);
    (r.loadingOrb.material as THREE.SpriteMaterial).dispose();
  }
  remotePets.delete(userId);
}

export function createRemoteNpc({
  id,
  petId,
  spritesheetUrl,
  x,
  y,
  z,
  scene,
  loadingOrbTexture
}: {
  id: string;
  petId: string;
  spritesheetUrl: string;
  x: number;
  y: number;
  z: number;
  scene: THREE.Scene;
  loadingOrbTexture: THREE.Texture | null;
}): RemoteNpc {
  const resolvedSpritesheetUrl = petTextureAssetUrl(spritesheetUrl);
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
  sprite.scale.set(SPRITE_WIDTH, SPRITE_HEIGHT, 1);
  sprite.center.set(0.5, 0);
  sprite.visible = false;
  sprite.position.set(x, y, z);
  scene.add(sprite);

  let loadingOrb: THREE.Sprite | null = null;
  if (loadingOrbTexture) {
    const orbMat = new THREE.SpriteMaterial({
      map: loadingOrbTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
      fog: false
    });
    loadingOrb = new THREE.Sprite(orbMat);
    loadingOrb.scale.set(SPRITE_WIDTH * 0.7, SPRITE_WIDTH * 0.7, 1);
    loadingOrb.center.set(0.5, 0);
    loadingOrb.position.set(x, y + SPRITE_HEIGHT * 0.35, z);
    scene.add(loadingOrb);
  }

  const npc: RemoteNpc = {
    id,
    petId,
    spritesheetUrl: resolvedSpritesheetUrl,
    sprite,
    mat,
    tex,
    imgReady: false,
    atlasRows: NPC_ATLAS_ROWS,
    loadingOrb,
    targetX: x,
    targetY: y,
    targetZ: z,
    targetTime: performance.now(),
    vx: 0,
    vz: 0,
    row: NPC_DEFS.idle.row,
    frames: NPC_DEFS.idle.frames,
    fps: NPC_DEFS.idle.fps,
    rowStart: performance.now()
  };
  img.onload = () => {
    npc.atlasRows = petAtlasRowsFromHeight(img.naturalHeight);
    tex.repeat.y = 1 / npc.atlasRows;
    npc.imgReady = true;
    tex.needsUpdate = true;
    sprite.visible = true;
    if (npc.loadingOrb) {
      scene.remove(npc.loadingOrb);
      (npc.loadingOrb.material as THREE.SpriteMaterial).dispose();
      npc.loadingOrb = null;
    }
  };
  img.onerror = () => { /* silent */ };
  img.src = resolvedSpritesheetUrl;
  return npc;
}
