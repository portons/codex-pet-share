import * as THREE from "three";
import {
  ATLAS_COLS,
  ATLAS_ROWS,
  ROW_TO_STATE,
  SPRITE_HEIGHT,
  SPRITE_WIDTH,
  SPRINT_FLASH_COLOR,
  STATES,
  type StateDef,
  type StateId
} from "../core/config";

export type PetSpriteAnimationFrame = {
  def: StateDef;
  frameIdx: number;
  facingFlip: 1 | -1;
  spriteY: number;
  scaleModX: number;
  scaleModY: number;
  lean: number;
  flashMix: number;
};

const flashColor = new THREE.Color(SPRINT_FLASH_COLOR);
const whiteColor = new THREE.Color(0xffffff);

export function isRunState(stateId: StateId) {
  return stateId === "running" || stateId === "running-left" || stateId === "running-right";
}

export function effectiveStateFps(stateId: StateId, sprinting: boolean) {
  const def = STATES[stateId];
  return isRunState(stateId) && sprinting ? def.fps * 1.4 : def.fps;
}

export function applyAtlasFrame(
  texture: THREE.Texture,
  row: number,
  frameIdx: number,
  opts?: {
    columns?: number;
    rows?: number;
    flipX?: boolean;
  }
) {
  const columns = opts?.columns ?? ATLAS_COLS;
  const rows = opts?.rows ?? ATLAS_ROWS;
  texture.repeat.y = 1 / rows;
  if (opts?.flipX) {
    texture.repeat.x = -1 / columns;
    texture.offset.x = (frameIdx + 1) / columns;
  } else {
    texture.repeat.x = 1 / columns;
    texture.offset.x = frameIdx / columns;
  }
  texture.offset.y = (rows - 1 - row) / rows;
}

export function applyPetSpriteVisuals(
  sprite: THREE.Sprite,
  material: THREE.SpriteMaterial,
  texture: THREE.Texture,
  frame: PetSpriteAnimationFrame,
  atlasRows = ATLAS_ROWS
) {
  sprite.position.y = frame.spriteY;
  sprite.scale.set(SPRITE_WIDTH * frame.scaleModX, SPRITE_HEIGHT * frame.scaleModY, 1);
  material.rotation = frame.lean;
  if (frame.flashMix > 0) {
    material.color.copy(whiteColor).lerp(flashColor, frame.flashMix);
  } else if (!material.color.equals(whiteColor)) {
    material.color.copy(whiteColor);
  }
  applyAtlasFrame(texture, frame.def.row, frame.frameIdx, { rows: atlasRows, flipX: frame.facingFlip === -1 });
}

export function remotePetFrame(row: number, broadcastFrame: number, rowStart: number, sprinting: boolean, now: number) {
  const stateById = ROW_TO_STATE[row];
  const def = stateById ? STATES[stateById] : undefined;
  if (!def || !def.loop) return broadcastFrame;
  const elapsedSinceRow = (now - rowStart) / 1000;
  return Math.floor(elapsedSinceRow * effectiveStateFps(stateById, sprinting)) % def.frames;
}
