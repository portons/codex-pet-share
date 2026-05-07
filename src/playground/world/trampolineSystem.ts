// Optional gamification layer for the 3D playground.
//
// Physics is hand-rolled (sphere-only, no external lib).

import * as THREE from "three";

const TRAMP_RADIUS = 1.4;
const TRAMP_BOOST = 1.7;
const TRAMP_AUTO_BOUNCE_VEL = 13;
// Pads are pruned to this many — newest wins. Stops the floor from being
// papered over after a thousand T presses.
const TRAMP_MAX_PADS = 8;

function paintTrampolineTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#e84a4a";
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff7d4";
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(195,28,28,0.45)";
  ctx.lineWidth = 4;
  for (let r = 8; r < 48; r += 8) {
    ctx.beginPath();
    ctx.arc(64, 64, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#e84a4a";
  ctx.beginPath();
  ctx.arc(64, 64, 6, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export type TrampolineSystem = {
  // ownerId is optional — solo callers can omit. Room callers should
  // pass the userId of who placed the pad so per-owner caps work.
  place: (x: number, z: number, ownerId?: string) => void;
  isOver: (x: number, z: number) => boolean;
  bounceMultiplier: number;
  autoBounceVel: number;
  update: (dt: number) => void;
  dispose: () => void;
  clear: () => void;
  hasPad: () => boolean;
  bounceTrigger: (x: number, z: number) => void;
  count: () => number;
  countForOwner: (ownerId: string) => number;
  removeOldestForOwner: (ownerId: string) => void;
  // Wipe every pad belonging to a single owner — used by the
  // "reset my stuff" path in permanent collection rooms so a user
  // doesn't nuke other people's pads on click.
  removeByOwner: (ownerId: string) => void;
  // Snapshot of every active pad — used to bring late-joining guests
  // up to date by re-emitting all current pads as tramp:add events.
  list: () => Array<{ x: number; z: number; ownerId: string | null }>;
};

type TrampPad = {
  mesh: THREE.Mesh;
  geom: THREE.CircleGeometry;
  mat: THREE.MeshBasicMaterial;
  wobble: number;
  wobbleAge: number;
  ownerId: string | null;
};

export function makeTrampolineSystem(scene: THREE.Scene): TrampolineSystem {
  // One shared texture across all pads — cheap, identical look.
  const tex = paintTrampolineTexture();
  const pads: TrampPad[] = [];

  function place(x: number, z: number, ownerId: string | null = null) {
    // Idempotent placement — if there's already a pad within a half-unit
    // of this spot, treat it as the same pad. This lets the host re-emit
    // tramp:add for late joiners (which broadcasts to existing guests
    // too) without ending up with stacked duplicates on every screen.
    for (const existing of pads) {
      if (Math.hypot(existing.mesh.position.x - x, existing.mesh.position.z - z) < 0.5) {
        return;
      }
    }
    // Reuse the same texture instance; per-pad geom/mat so each can wobble
    // independently when struck.
    const geom = new THREE.CircleGeometry(TRAMP_RADIUS, 32);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.04, z);
    scene.add(mesh);
    pads.push({ mesh, geom, mat, wobble: 0, wobbleAge: 0, ownerId });
    // Prune oldest if we exceed the cap so the scene doesn't stack pads.
    while (pads.length > TRAMP_MAX_PADS) {
      const old = pads.shift()!;
      scene.remove(old.mesh);
      old.geom.dispose();
      old.mat.dispose();
    }
  }

  function countForOwner(ownerId: string): number {
    let n = 0;
    for (const p of pads) if (p.ownerId === ownerId) n += 1;
    return n;
  }

  function removeOldestForOwner(ownerId: string) {
    for (let i = 0; i < pads.length; i += 1) {
      if (pads[i].ownerId === ownerId) {
        const old = pads[i];
        scene.remove(old.mesh);
        old.geom.dispose();
        old.mat.dispose();
        pads.splice(i, 1);
        return;
      }
    }
  }

  function removeByOwner(ownerId: string) {
    for (let i = pads.length - 1; i >= 0; i -= 1) {
      if (pads[i].ownerId === ownerId) {
        const old = pads[i];
        scene.remove(old.mesh);
        old.geom.dispose();
        old.mat.dispose();
        pads.splice(i, 1);
      }
    }
  }

  function isOver(x: number, z: number): boolean {
    for (const p of pads) {
      if (Math.hypot(x - p.mesh.position.x, z - p.mesh.position.z) < TRAMP_RADIUS) return true;
    }
    return false;
  }

  // Find the pad nearest to (x, z). Used by bounceTrigger so the wobble
  // animation fires on the pad that was actually struck.
  function nearestPad(x: number, z: number): TrampPad | null {
    let best: TrampPad | null = null;
    let bestD = Infinity;
    for (const p of pads) {
      const d = Math.hypot(x - p.mesh.position.x, z - p.mesh.position.z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  function bounceTrigger(x: number, z: number) {
    const p = nearestPad(x, z);
    if (p) { p.wobble = 1; p.wobbleAge = 0; }
  }

  function update(dt: number) {
    for (const p of pads) {
      if (p.wobble > 0.001) {
        p.wobbleAge += dt;
        const k = Math.exp(-p.wobbleAge * 8);
        const s = 1 + Math.sin(p.wobbleAge * 26) * 0.18 * k;
        p.mesh.scale.set(s, s, 1);
        p.wobble = k;
      } else {
        p.mesh.scale.set(1, 1, 1);
        p.wobbleAge = 0;
      }
    }
  }

  function clear() {
    for (const p of pads) {
      scene.remove(p.mesh);
      p.geom.dispose();
      p.mat.dispose();
    }
    pads.length = 0;
  }

  function dispose() {
    clear();
    tex.dispose();
  }

  return {
    place,
    isOver,
    bounceMultiplier: TRAMP_BOOST,
    autoBounceVel: TRAMP_AUTO_BOUNCE_VEL,
    update,
    dispose,
    clear,
    hasPad: () => pads.length > 0,
    bounceTrigger,
    count: () => pads.length,
    countForOwner,
    removeOldestForOwner,
    removeByOwner,
    list: () => pads.map((p) => ({
      x: p.mesh.position.x,
      z: p.mesh.position.z,
      ownerId: p.ownerId
    }))
  };
}

// ---------------------------------------------------------------------------
