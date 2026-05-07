import * as THREE from "three";
import {
  AFTERIMAGE_INITIAL_OPACITY,
  AFTERIMAGE_LIFETIME,
  AFTERIMAGE_SPAWN_INTERVAL,
  DUST_LIFETIME,
  SPRITE_HEIGHT,
  SPRITE_WIDTH,
  STREAKS_PER_SPAWN,
  STREAK_BACKWARD_BOOST,
  STREAK_LIFETIME,
  STREAK_SPAWN_INTERVAL
} from "../core/config";

export type SpawnDust = (
  x: number,
  z: number,
  count: number,
  opts?: { vScale?: number; sizeScale?: number; life?: number; yStart?: number }
) => void;

type Streak = {
  obj: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  age: number;
  life: number;
  vx: number;
  vz: number;
  baseLen: number;
  baseOpacity: number;
};

type Dust = {
  obj: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  age: number;
  life: number;
  vx: number;
  vy: number;
  vz: number;
  baseScale: number;
};

type AfterImage = {
  obj: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  tex: THREE.Texture;
  age: number;
  life: number;
  baseOpacity: number;
};

export function createSpriteEffects({
  scene,
  localSprite,
  getLocalTexture
}: {
  scene: THREE.Scene;
  localSprite: THREE.Sprite;
  getLocalTexture: () => THREE.Texture | null;
}) {
  const streakCanvas = document.createElement("canvas");
  streakCanvas.width = 96;
  streakCanvas.height = 4;
  const sctx = streakCanvas.getContext("2d");
  if (sctx) {
    const grad = sctx.createLinearGradient(0, 0, 96, 0);
    grad.addColorStop(0.00, "rgba(255,255,255,0)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.92)");
    grad.addColorStop(0.55, "rgba(255,255,255,1)");
    grad.addColorStop(0.85, "rgba(255,255,255,0.65)");
    grad.addColorStop(1.00, "rgba(255,255,255,0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 96, 4);
  }
  const streakTexture = new THREE.CanvasTexture(streakCanvas);
  streakTexture.colorSpace = THREE.SRGBColorSpace;
  streakTexture.minFilter = THREE.LinearFilter;
  streakTexture.magFilter = THREE.LinearFilter;

  const dustCanvas = document.createElement("canvas");
  dustCanvas.width = 32;
  dustCanvas.height = 32;
  const dctx = dustCanvas.getContext("2d");
  if (dctx) {
    const grad = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0.0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.5, "rgba(225,220,205,0.55)");
    grad.addColorStop(1.0, "rgba(225,220,205,0)");
    dctx.fillStyle = grad;
    dctx.beginPath();
    dctx.arc(16, 16, 16, 0, Math.PI * 2);
    dctx.fill();
  }
  const dustTexture = new THREE.CanvasTexture(dustCanvas);
  dustTexture.colorSpace = THREE.SRGBColorSpace;
  dustTexture.minFilter = THREE.LinearFilter;
  dustTexture.magFilter = THREE.LinearFilter;

  const streaks: Streak[] = [];
  const dustParticles: Dust[] = [];
  const afterImages: AfterImage[] = [];
  let streakSpawnTimer = 0;
  let afterImageSpawnTimer = 0;

  function spawnStreaks(
    now: number,
    fromX: number,
    fromZ: number,
    worldDirX: number,
    worldDirZ: number,
    screenDirX: number,
    screenDirZ: number,
    runSpeed: number
  ) {
    for (let i = 0; i < STREAKS_PER_SPAWN; i += 1) {
      const perpX = -worldDirZ;
      const perpZ = worldDirX;
      const lateral = (Math.random() - 0.5) * SPRITE_WIDTH * 1.4;
      const back = (0.15 + Math.random() * 0.4) * SPRITE_WIDTH;
      const x = fromX + perpX * lateral - worldDirX * back;
      const z = fromZ + perpZ * lateral - worldDirZ * back;
      const y = 0.45 + Math.random() * (SPRITE_HEIGHT - 0.6);
      const mat = new THREE.SpriteMaterial({
        map: streakTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
        fog: false
      });
      mat.rotation = Math.atan2(-screenDirZ, screenDirX);
      const len = 1.6 + Math.random() * 1.6;
      const thickness = 0.07 + Math.random() * 0.07;
      const obj = new THREE.Sprite(mat);
      obj.scale.set(len, thickness, 1);
      obj.position.set(x, y, z);
      scene.add(obj);
      streaks.push({
        obj,
        mat,
        age: 0,
        life: STREAK_LIFETIME * (0.85 + Math.random() * 0.4),
        vx: -worldDirX * runSpeed * STREAK_BACKWARD_BOOST,
        vz: -worldDirZ * runSpeed * STREAK_BACKWARD_BOOST,
        baseLen: len,
        baseOpacity: 0.85
      });
    }
    void now;
  }

  const spawnDust: SpawnDust = (fromX, fromZ, count, opts) => {
    const vScale = opts?.vScale ?? 1;
    const sizeScale = opts?.sizeScale ?? 1;
    const life = opts?.life ?? DUST_LIFETIME;
    const yStart = opts?.yStart ?? 0.18;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (1.4 + Math.random() * 1.6) * vScale;
      const lateralR = (0.12 + Math.random() * 0.18) * SPRITE_WIDTH;
      const mat = new THREE.SpriteMaterial({
        map: dustTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
        fog: true
      });
      const obj = new THREE.Sprite(mat);
      const baseScale = (0.45 + Math.random() * 0.35) * sizeScale;
      obj.scale.set(baseScale, baseScale, 1);
      obj.center.set(0.5, 0.5);
      obj.position.set(
        fromX + Math.cos(angle) * lateralR,
        yStart + Math.random() * 0.18,
        fromZ + Math.sin(angle) * lateralR
      );
      scene.add(obj);
      dustParticles.push({
        obj,
        mat,
        age: 0,
        life,
        vx: Math.cos(angle) * speed,
        vy: 0.6 + Math.random() * 0.4,
        vz: Math.sin(angle) * speed,
        baseScale
      });
    }
  };

  function spawnAfterImageFor(sourceSprite: THREE.Sprite, sourceTex: THREE.Texture) {
    const ghostTex = sourceTex.clone();
    ghostTex.offset.copy(sourceTex.offset);
    ghostTex.repeat.copy(sourceTex.repeat);
    ghostTex.needsUpdate = true;
    const ghostMat = new THREE.SpriteMaterial({
      map: ghostTex,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false,
      fog: true,
      opacity: AFTERIMAGE_INITIAL_OPACITY
    });
    ghostMat.rotation = (sourceSprite.material as THREE.SpriteMaterial).rotation;
    const obj = new THREE.Sprite(ghostMat);
    obj.scale.copy(sourceSprite.scale);
    obj.center.copy(sourceSprite.center);
    obj.position.copy(sourceSprite.position);
    scene.add(obj);
    afterImages.push({
      obj,
      mat: ghostMat,
      tex: ghostTex,
      age: 0,
      life: AFTERIMAGE_LIFETIME,
      baseOpacity: AFTERIMAGE_INITIAL_OPACITY
    });
  }

  function spawnAfterImage(now: number) {
    const texture = getLocalTexture();
    if (!texture) return;
    spawnAfterImageFor(localSprite, texture);
    void now;
  }

  function spawnSprintStreaksWorld(fromX: number, fromZ: number, worldDirX: number, worldDirZ: number, runSpeed: number) {
    spawnStreaks(performance.now(), fromX, fromZ, worldDirX, worldDirZ, worldDirX, worldDirZ, runSpeed);
  }

  function tickSprintStreaks({
    now,
    dt,
    fromX,
    fromZ,
    worldDirX,
    worldDirZ,
    screenDirX,
    screenDirZ,
    runSpeed
  }: {
    now: number;
    dt: number;
    fromX: number;
    fromZ: number;
    worldDirX: number;
    worldDirZ: number;
    screenDirX: number;
    screenDirZ: number;
    runSpeed: number;
  }) {
    streakSpawnTimer += dt;
    while (streakSpawnTimer >= STREAK_SPAWN_INTERVAL) {
      streakSpawnTimer -= STREAK_SPAWN_INTERVAL;
      spawnStreaks(now, fromX, fromZ, worldDirX, worldDirZ, screenDirX, screenDirZ, runSpeed);
    }
  }

  function tickAfterImages(now: number, dt: number) {
    afterImageSpawnTimer += dt;
    while (afterImageSpawnTimer >= AFTERIMAGE_SPAWN_INTERVAL) {
      afterImageSpawnTimer -= AFTERIMAGE_SPAWN_INTERVAL;
      spawnAfterImage(now);
    }
  }

  function update(dt: number) {
    for (let i = streaks.length - 1; i >= 0; i -= 1) {
      const s = streaks[i];
      s.age += dt;
      if (s.age >= s.life) {
        scene.remove(s.obj);
        s.mat.dispose();
        streaks.splice(i, 1);
        continue;
      }
      const t = s.age / s.life;
      s.obj.position.x += s.vx * dt;
      s.obj.position.z += s.vz * dt;
      const fade = 1 - t * t;
      s.mat.opacity = s.baseOpacity * fade;
      s.obj.scale.x = s.baseLen * (1 - t * 0.45);
    }

    for (let i = dustParticles.length - 1; i >= 0; i -= 1) {
      const d = dustParticles[i];
      d.age += dt;
      if (d.age >= d.life) {
        scene.remove(d.obj);
        d.mat.dispose();
        dustParticles.splice(i, 1);
        continue;
      }
      const t = d.age / d.life;
      d.obj.position.x += d.vx * dt;
      d.obj.position.y += d.vy * dt;
      d.obj.position.z += d.vz * dt;
      d.vy -= 1.4 * dt;
      d.vx *= 1 - 1.6 * dt;
      d.vz *= 1 - 1.6 * dt;
      const fade = 1 - t;
      d.mat.opacity = 0.85 * fade;
      const grow = 1 + t * 0.6;
      d.obj.scale.set(d.baseScale * grow, d.baseScale * grow, 1);
    }

    for (let i = afterImages.length - 1; i >= 0; i -= 1) {
      const g = afterImages[i];
      g.age += dt;
      if (g.age >= g.life) {
        scene.remove(g.obj);
        g.mat.dispose();
        g.tex.dispose();
        afterImages.splice(i, 1);
        continue;
      }
      const t = g.age / g.life;
      g.mat.opacity = g.baseOpacity * (1 - t);
    }
  }

  function clear() {
    for (const s of streaks) {
      scene.remove(s.obj);
      s.mat.dispose();
    }
    streaks.length = 0;
    for (const d of dustParticles) {
      scene.remove(d.obj);
      d.mat.dispose();
    }
    dustParticles.length = 0;
    for (const g of afterImages) {
      scene.remove(g.obj);
      g.mat.dispose();
      g.tex.dispose();
    }
    afterImages.length = 0;
  }

  return {
    disposables: [streakTexture, dustTexture],
    spawnDust,
    spawnAfterImageFor,
    spawnSprintStreaksWorld,
    tickSprintStreaks,
    resetStreakTimer: () => { streakSpawnTimer = 0; },
    tickAfterImages,
    resetAfterImageTimer: () => { afterImageSpawnTimer = 0; },
    update,
    clear
  };
}
