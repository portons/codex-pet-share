import * as THREE from "three";

export const BALL_GRAVITY = 16;
export const BALL_GROUND_RESTITUTION = 0.32;
export const BALL_WALL_RESTITUTION = 0.42;
export const BALL_FRICTION = 1.4;
export const BALL_RADIUS_DEFAULT = 0.55;
export const BALL_PET_BUMP_BOOST = 1.6;

export const PET_COLLIDE_RADIUS = 0.6;
export const PET_COLLIDE_HEIGHT = 3.4;

export type BallActor = {
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  radius: number;
  height: number;
};

export type Ball = {
  id: string;
  ownerId: string;
  simulated: boolean;
  obj: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  geom: THREE.SphereGeometry;
  tex: THREE.CanvasTexture;
  shadow: THREE.Mesh;
  shadowMat: THREE.MeshBasicMaterial;
  shadowGeom: THREE.CircleGeometry;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  radius: number;
  quat: THREE.Quaternion;
};

export type BallSnapshot = {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

export type BallSystem = {
  spawn: (origin: THREE.Vector3, facingX: number, facingZ: number, sprinting: boolean) => void;
  spawnWithId: (
    id: string,
    ownerId: string,
    origin: THREE.Vector3,
    facingX: number,
    facingZ: number,
    sprinting: boolean
  ) => void;
  addRemote: (id: string, ownerId: string, x: number, y: number, z: number) => void;
  applySnapshot: (snap: BallSnapshot) => void;
  snapshot: () => BallSnapshot[];
  removeById: (id: string) => void;
  removeByOwner: (ownerId: string) => void;
  countForOwner: (ownerId: string) => number;
  removeOldestForOwner: (ownerId: string) => void;
  update: (dt: number, actors: BallActor[], floorHalf: number) => void;
  clear: () => void;
  count: () => number;
  dispose: () => void;
};
