import { PET_COLLISION_RADIUS, PLAYGROUND_BLOCKED_ZONES } from "./config";

export function clampToPlaygroundFloor(value: number, limit: number) {
  return Math.max(-limit, Math.min(limit, value));
}

export function canOccupyPlaygroundPosition(x: number, z: number, radius = PET_COLLISION_RADIUS) {
  return PLAYGROUND_BLOCKED_ZONES.every((zone) => {
    if (zone.kind === "circle") {
      return Math.hypot(x - zone.x, z - zone.z) > zone.radius + radius;
    }
    const dx = Math.max(Math.abs(x - zone.x) - zone.width / 2, 0);
    const dz = Math.max(Math.abs(z - zone.z) - zone.depth / 2, 0);
    return Math.hypot(dx, dz) > radius;
  });
}
