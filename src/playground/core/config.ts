import { RO_PRONTERA_BLOCKED_ZONES, RO_PRONTERA_FLOOR_HALF } from "./roPronteraBiome.generated";

export const CHAT_BUBBLE_TTL_MS = 5000;
export const POS_BROADCAST_INTERVAL_MS = 1000 / 12;
export const REMOTE_PET_LERP = 0.3;

export const GUEST_BALL_CAP = 3;
export const GUEST_PAD_CAP = 2;
export const COLLECTION_BALL_CAP = 2;
export const COLLECTION_PAD_CAP = 1;

export const SPRITE_CELL_W = 192;
export const SPRITE_CELL_H = 208;
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 9;

export type StateId =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

export type StateDef = { id: StateId; row: number; frames: number; fps: number; loop: boolean };

export const STATES: Record<StateId, StateDef> = {
  idle: { id: "idle", row: 0, frames: 6, fps: 6, loop: true },
  "running-right": { id: "running-right", row: 1, frames: 8, fps: 12, loop: true },
  "running-left": { id: "running-left", row: 2, frames: 8, fps: 12, loop: true },
  waving: { id: "waving", row: 3, frames: 4, fps: 5, loop: false },
  jumping: { id: "jumping", row: 4, frames: 5, fps: 14, loop: false },
  failed: { id: "failed", row: 5, frames: 8, fps: 6, loop: false },
  waiting: { id: "waiting", row: 6, frames: 6, fps: 4, loop: true },
  running: { id: "running", row: 7, frames: 6, fps: 12, loop: true },
  review: { id: "review", row: 8, frames: 6, fps: 6, loop: true }
};

export const ROW_TO_STATE: Record<number, StateId> = (() => {
  const out: Record<number, StateId> = {};
  for (const def of Object.values(STATES)) out[def.row] = def.id;
  return out;
})();

export const FLOOR_HALF = RO_PRONTERA_FLOOR_HALF;
export const SPRITE_HEIGHT = 4;
export const SPRITE_WIDTH = SPRITE_HEIGHT * (SPRITE_CELL_W / SPRITE_CELL_H);
export const PET_COLLISION_RADIUS = 0.45;
export type PlaygroundBlockedZone =
  | { kind: "circle"; x: number; z: number; radius: number }
  | { kind: "rect"; x: number; z: number; width: number; depth: number };
export const PLAYGROUND_BLOCKED_ZONES: readonly PlaygroundBlockedZone[] = RO_PRONTERA_BLOCKED_ZONES;
export const MOVE_SPEED = 9;
export const SPRINT_MULTIPLIER = 1.85;
export const JUMP_VELOCITY = 9;
export const GRAVITY = 22;
export const IDLE_TO_WAITING_MS = 4500;

export const FOV = 22;
export const CAMERA_HEIGHT = 22;
export const CAMERA_DISTANCE = 26;
export const CAMERA_LOOK_Y = 3.2;
export const CAMERA_FOLLOW_LERP = 0.08;
export const CAMERA_ZOOM_MIN = 0.55;
export const CAMERA_ZOOM_MAX = 1.85;
export const CAMERA_ZOOM_STEP_WHEEL = 0.0015;
export const CAMERA_ZOOM_STEP_KEY = 0.12;
export const CAMERA_ZOOM_SMOOTH_RATE = 8;

export const STREAK_SPAWN_INTERVAL = 1 / 28;
export const STREAKS_PER_SPAWN = 2;
export const STREAK_LIFETIME = 0.34;
export const STREAK_BACKWARD_BOOST = 1.55;
export const DUST_LIFETIME = 0.36;
export const AFTERIMAGE_SPAWN_INTERVAL = 0.08;
export const AFTERIMAGE_LIFETIME = 0.34;
export const AFTERIMAGE_INITIAL_OPACITY = 0.32;

export const BALL_SPAWN_COOLDOWN_MS = 220;
export const PAD_PLACE_COOLDOWN_MS = 320;

export const MAX_LEAN_DEG = 14;
export const LEAN_RESPONSE = 9;
export const SIT_HOLD_TIMEOUT_S = 2;
export const IDLE_BOB_FREQ_HZ = 0.85;
export const IDLE_BOB_AMPLITUDE = 0.06;

export const JUMP_ANTICIPATION_MS = 90;
export const JUMP_ANTICIPATION_SCALE_Y = 0.85;
export const JUMP_ANTICIPATION_SCALE_X = 1.10;
export const JUMP_ASCEND_SCALE_Y = 1.10;
export const JUMP_ASCEND_SCALE_X = 0.93;
export const LAND_SQUASH_MS = 110;
export const LAND_SQUASH_SCALE_Y = 0.78;
export const LAND_SQUASH_SCALE_X = 1.16;
export const SQUASH_EASE_RATE = 14;
export const LEAN_RESPONSE_STOPPED = 4;
export const LAND_HITSTOP_MS = 32;

export const SPRINT_FLASH_MS = 160;
export const SPRINT_FLASH_COLOR = "#fff0c8";
export const IDLE_VARIATION_INTERVAL_MS = 6500;
export const WAVE_PEAK_FRAME = 2;
export const WAVE_PEAK_STRETCH_Y = 1.05;
export const WAVE_PEAK_STRETCH_X = 0.97;
export const RUN_FOOTSTEP_FRAMES = [0, 4];

export const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0]
};
