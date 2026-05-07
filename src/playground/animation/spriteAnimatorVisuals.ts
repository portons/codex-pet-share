import {
  IDLE_BOB_AMPLITUDE,
  IDLE_BOB_FREQ_HZ,
  JUMP_ANTICIPATION_SCALE_X,
  JUMP_ANTICIPATION_SCALE_Y,
  JUMP_ASCEND_SCALE_X,
  JUMP_ASCEND_SCALE_Y,
  JUMP_VELOCITY,
  LAND_SQUASH_SCALE_X,
  LAND_SQUASH_SCALE_Y,
  LEAN_RESPONSE,
  LEAN_RESPONSE_STOPPED,
  RUN_FOOTSTEP_FRAMES,
  SQUASH_EASE_RATE,
  STATES,
  WAVE_PEAK_FRAME,
  WAVE_PEAK_STRETCH_X,
  WAVE_PEAK_STRETCH_Y,
  type StateDef,
  type StateId
} from "../core/config";
import { effectiveStateFps, isRunState } from "./spriteAtlas";
import type { DustEmitter, SitPhase } from "./spriteAnimation";

export function idleBob({
  now,
  onGround,
  pendingJumpAt,
  stateId
}: {
  now: number;
  onGround: boolean;
  pendingJumpAt: number;
  stateId: StateId;
}) {
  if (
    onGround
    && pendingJumpAt < 0
    && (stateId === "idle" || stateId === "waiting" || stateId === "review")
  ) {
    return Math.sin((now / 1000) * IDLE_BOB_FREQ_HZ * Math.PI * 2) * IDLE_BOB_AMPLITUDE;
  }
  return 0;
}

export function nextScaleModifiers({
  now,
  dt,
  stateId,
  stateStart,
  waveCancelStart,
  pendingJumpAt,
  onGround,
  yVel,
  landSquashUntil,
  scaleModX,
  scaleModY
}: {
  now: number;
  dt: number;
  stateId: StateId;
  stateStart: number;
  waveCancelStart: number;
  pendingJumpAt: number;
  onGround: boolean;
  yVel: number;
  landSquashUntil: number;
  scaleModX: number;
  scaleModY: number;
}) {
  let targetScaleY = 1;
  let targetScaleX = 1;
  if (pendingJumpAt >= 0 && onGround) {
    targetScaleY = JUMP_ANTICIPATION_SCALE_Y;
    targetScaleX = JUMP_ANTICIPATION_SCALE_X;
  } else if (!onGround && yVel > 0.5) {
    const k = Math.min(1, yVel / JUMP_VELOCITY);
    targetScaleY = 1 + (JUMP_ASCEND_SCALE_Y - 1) * k;
    targetScaleX = 1 + (JUMP_ASCEND_SCALE_X - 1) * k;
  } else if (!onGround && yVel < -0.5) {
    const k = Math.min(1, -yVel / JUMP_VELOCITY);
    targetScaleY = 1 + (JUMP_ASCEND_SCALE_Y - 1) * 0.4 * k;
    targetScaleX = 1 + (JUMP_ASCEND_SCALE_X - 1) * 0.4 * k;
  } else if (now < landSquashUntil) {
    targetScaleY = LAND_SQUASH_SCALE_Y;
    targetScaleX = LAND_SQUASH_SCALE_X;
  } else if (stateId === "waving") {
    const def = STATES.waving;
    const elapsed = waveCancelStart >= 0 ? 0 : (now - stateStart) / 1000;
    const playedFrame = elapsed * def.fps;
    const peakDistance = Math.abs(playedFrame - WAVE_PEAK_FRAME);
    if (peakDistance < 1) {
      const k = 1 - peakDistance;
      targetScaleY = 1 + (WAVE_PEAK_STRETCH_Y - 1) * k;
      targetScaleX = 1 + (WAVE_PEAK_STRETCH_X - 1) * k;
    }
  }

  const scaleEaseT = Math.min(1, dt * SQUASH_EASE_RATE);
  return {
    scaleModX: scaleModX + (targetScaleX - scaleModX) * scaleEaseT,
    scaleModY: scaleModY + (targetScaleY - scaleModY) * scaleEaseT
  };
}

export function nextFootstepFrame({
  now,
  sprinting,
  onGround,
  stateId,
  stateStart,
  lastFootstepFrame,
  spawnDust,
  petX,
  petZ
}: {
  now: number;
  sprinting: boolean;
  onGround: boolean;
  stateId: StateId;
  stateStart: number;
  lastFootstepFrame: number;
  spawnDust: DustEmitter;
  petX: number;
  petZ: number;
}) {
  if (!onGround || !isRunState(stateId)) return -1;
  const runDef = STATES[stateId];
  const runElapsed = (now - stateStart) / 1000;
  const runFps = sprinting ? runDef.fps * 1.4 : runDef.fps;
  const rawFrame = Math.floor(runElapsed * runFps) % runDef.frames;
  if (RUN_FOOTSTEP_FRAMES.includes(rawFrame) && lastFootstepFrame !== rawFrame) {
    spawnDust(petX, petZ, 2, { vScale: 0.4, sizeScale: 0.55, life: 0.22, yStart: 0.08 });
    return rawFrame;
  }
  return RUN_FOOTSTEP_FRAMES.includes(rawFrame) ? lastFootstepFrame : -1;
}

export function nextLean({
  dx,
  moving,
  sprinting,
  dt,
  onGround,
  currentLean,
  maxLeanRad
}: {
  dx: number;
  moving: boolean;
  sprinting: boolean;
  dt: number;
  onGround: boolean;
  currentLean: number;
  maxLeanRad: number;
}) {
  const speedScale = sprinting ? 1.0 : 0.65;
  const targetLean = moving ? -dx * maxLeanRad * speedScale : 0;
  const leanRate = !moving && onGround ? LEAN_RESPONSE_STOPPED : LEAN_RESPONSE;
  const leanT = Math.min(1, leanRate * dt);
  return currentLean + (targetLean - currentLean) * leanT;
}

export function frameIndex({
  now,
  sprinting,
  stateId,
  stateStart,
  onGround,
  airborneFrozenFrame,
  waveCancelStart,
  sitPhase,
  sitPhaseStart,
  def
}: {
  now: number;
  sprinting: boolean;
  stateId: StateId;
  stateStart: number;
  onGround: boolean;
  airborneFrozenFrame: number | null;
  waveCancelStart: number;
  sitPhase: SitPhase;
  sitPhaseStart: number;
  def: StateDef;
}) {
  const fps = effectiveStateFps(stateId, sprinting);
  if (!onGround && airborneFrozenFrame !== null) return airborneFrozenFrame;
  if (stateId === "waving" && waveCancelStart >= 0) {
    const reverseElapsed = (now - waveCancelStart) / 1000;
    return Math.max(0, def.frames - 1 - Math.floor(reverseElapsed * def.fps));
  }
  if (stateId === "failed" && sitPhase) {
    const sitTargetFrame = Math.floor((def.frames - 1) / 2);
    const phaseElapsed = (now - sitPhaseStart) / 1000;
    if (sitPhase === "down") return Math.min(sitTargetFrame, Math.floor(phaseElapsed * def.fps));
    if (sitPhase === "hold") return sitTargetFrame;
    if (sitPhase === "up") return Math.max(0, sitTargetFrame - Math.floor(phaseElapsed * def.fps));
    return Math.min(def.frames - 1, sitTargetFrame + Math.floor(phaseElapsed * def.fps));
  }
  const elapsed = (now - stateStart) / 1000;
  const rawFrame = elapsed * fps;
  return def.loop
    ? Math.floor(rawFrame) % def.frames
    : Math.min(def.frames - 1, Math.floor(rawFrame));
}
