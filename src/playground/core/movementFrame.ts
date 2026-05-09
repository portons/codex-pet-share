import * as THREE from "three";
import {
  CAMERA_DISTANCE,
  CAMERA_FOLLOW_LERP,
  CAMERA_HEIGHT,
  CAMERA_LOOK_Y,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_SMOOTH_RATE,
  CAMERA_ZOOM_STEP_KEY,
  FLOOR_HALF,
  MOVE_KEYS,
  MOVE_SPEED,
  SPRITE_WIDTH,
  SPRINT_MULTIPLIER
} from "./config";
import { canOccupyPlaygroundPosition, clampToPlaygroundFloor } from "./collision";

export type MovementFrame = {
  dx: number;
  dz: number;
  moving: boolean;
  sprinting: boolean;
  runSpeed: number;
  worldDx: number;
  worldDz: number;
};

export function applyMovementInput({
  pressed,
  sprite,
  yaw,
  dt
}: {
  pressed: Set<string>;
  sprite: THREE.Sprite;
  yaw: number;
  dt: number;
}): MovementFrame {
  let dx = 0;
  let dz = 0;
  for (const code of pressed) {
    const vec = MOVE_KEYS[code];
    if (vec) {
      dx += vec[0];
      dz += vec[1];
    }
  }
  const moving = dx !== 0 || dz !== 0;
  const sprinting = moving && (pressed.has("ShiftLeft") || pressed.has("ShiftRight"));
  const runSpeed = MOVE_SPEED * (sprinting ? SPRINT_MULTIPLIER : 1);
  let worldDx = 0;
  let worldDz = 0;
  if (moving) {
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    worldDx = dx * cosY + dz * sinY;
    worldDz = -dx * sinY + dz * cosY;
    const limit = FLOOR_HALF - SPRITE_WIDTH / 2;
    const targetX = clampToPlaygroundFloor(sprite.position.x + worldDx * runSpeed * dt, limit);
    const targetZ = clampToPlaygroundFloor(sprite.position.z + worldDz * runSpeed * dt, limit);
    const currentX = sprite.position.x;
    const currentZ = sprite.position.z;
    if (canOccupyPlaygroundPosition(targetX, targetZ)) {
      sprite.position.x = targetX;
      sprite.position.z = targetZ;
    } else {
      if (canOccupyPlaygroundPosition(targetX, currentZ)) sprite.position.x = targetX;
      if (canOccupyPlaygroundPosition(sprite.position.x, targetZ)) sprite.position.z = targetZ;
    }
  }
  return { dx, dz, moving, sprinting, runSpeed, worldDx, worldDz };
}

export function updateCameraZoom({
  pressed,
  zoomTarget,
  zoomDisplay,
  dt
}: {
  pressed: Set<string>;
  zoomTarget: { value: number };
  zoomDisplay: number;
  dt: number;
}) {
  if (pressed.has("Equal") || pressed.has("NumpadAdd")) {
    zoomTarget.value = Math.max(CAMERA_ZOOM_MIN, zoomTarget.value - CAMERA_ZOOM_STEP_KEY * dt * 60);
  }
  if (pressed.has("Minus") || pressed.has("NumpadSubtract")) {
    zoomTarget.value = Math.min(CAMERA_ZOOM_MAX, zoomTarget.value + CAMERA_ZOOM_STEP_KEY * dt * 60);
  }
  return zoomDisplay + (zoomTarget.value - zoomDisplay) * Math.min(1, dt * CAMERA_ZOOM_SMOOTH_RATE);
}

export function updateCameraFollow({
  camera,
  sprite,
  yaw,
  zoomDisplay
}: {
  camera: THREE.PerspectiveCamera;
  sprite: THREE.Sprite;
  yaw: number;
  zoomDisplay: number;
}) {
  const distNow = CAMERA_DISTANCE * zoomDisplay;
  const heightNow = CAMERA_HEIGHT * zoomDisplay;
  const camTargetX = sprite.position.x + Math.sin(yaw) * distNow;
  const camTargetZ = sprite.position.z + Math.cos(yaw) * distNow;
  camera.position.x += (camTargetX - camera.position.x) * CAMERA_FOLLOW_LERP;
  camera.position.z += (camTargetZ - camera.position.z) * CAMERA_FOLLOW_LERP;
  camera.position.y = heightNow;
  camera.lookAt(sprite.position.x, CAMERA_LOOK_Y, sprite.position.z);
}

export function updateLocalShadow({
  shadow,
  camera,
  sprite,
  onGround,
  yPos
}: {
  shadow: THREE.Mesh;
  camera: THREE.PerspectiveCamera;
  sprite: THREE.Sprite;
  onGround: boolean;
  yPos: number;
}) {
  shadow.position.x = sprite.position.x;
  shadow.position.z = sprite.position.z;
  const distToCam = camera.position.distanceTo(sprite.position);
  const camScale = Math.max(0.45, 1.6 - distToCam / 22);
  const airShrink = onGround ? 1 : Math.max(0.55, 1 - yPos / 6);
  const totalShadow = camScale * airShrink;
  shadow.scale.set(totalShadow, totalShadow, 1);
  (shadow.material as THREE.MeshBasicMaterial).opacity = 0.18 * airShrink;
}
