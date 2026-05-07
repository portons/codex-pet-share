import * as THREE from "three";

export type ScreenPoint = { x: number; y: number; visible: boolean };

const scratch = new THREE.Vector3();

export function worldToScreen(
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  worldPos: THREE.Vector3,
  out: ScreenPoint = { x: 0, y: 0, visible: false }
): ScreenPoint {
  scratch.copy(worldPos).project(camera);
  const visible = scratch.z >= -1 && scratch.z <= 1;
  const size = renderer.getSize(new THREE.Vector2());
  out.x = (scratch.x * 0.5 + 0.5) * size.x;
  out.y = (-scratch.y * 0.5 + 0.5) * size.y;
  out.visible = visible;
  return out;
}
