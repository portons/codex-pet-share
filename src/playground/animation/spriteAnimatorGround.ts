import {
  IDLE_TO_WAITING_MS,
  IDLE_VARIATION_INTERVAL_MS,
  SIT_HOLD_TIMEOUT_S,
  STATES,
  type StateId
} from "../core/config";
import type { DustEmitter, SitPhase } from "./spriteAnimation";

export type GroundAnimationState = {
  stateId: StateId;
  stateStart: number;
  lastIdleSettleAt: number;
  idleVariationLastSwap: number;
  waveCancelStart: number;
  sitPhase: SitPhase;
  sitPhaseStart: number;
};

export function advanceGroundAnimation(
  state: GroundAnimationState,
  {
    now,
    pressed,
    dx,
    dz,
    moving,
    spawnDust,
    petX,
    petZ
  }: {
    now: number;
    pressed: Set<string>;
    dx: number;
    dz: number;
    moving: boolean;
    spawnDust: DustEmitter;
    petX: number;
    petZ: number;
  }
) {
  const next = { ...state };
  const setState = (stateId: StateId) => {
    if (stateId === next.stateId) return;
    next.stateId = stateId;
    next.stateStart = now;
  };
  const pickGroundState = () => pickGroundStateId(next, dx, dz, now);

  if (pressed.has("KeyQ")) {
    pressed.delete("KeyQ");
    if (next.stateId !== "failed") {
      setState("failed");
      next.sitPhase = "down";
      next.sitPhaseStart = now;
    } else if (next.sitPhase === "hold") {
      next.sitPhase = "up";
      next.sitPhaseStart = now;
    }
  }

  if (pressed.has("KeyE") && next.stateId !== "failed" && next.stateId !== "waving") {
    pressed.delete("KeyE");
    setState("waving");
    next.waveCancelStart = -1;
  }

  if (next.stateId === "waving") {
    advanceWaving(next, now, dx, dz, moving, setState, pickGroundState);
  } else if (next.stateId === "failed") {
    advanceSit(next, now, dx, dz, moving, spawnDust, petX, petZ, setState, pickGroundState);
  } else {
    setState(pickGroundState());
  }

  return next;
}

export function pickGroundStateId(state: GroundAnimationState, dx: number, dz: number, now: number): StateId {
  if (dx === 0 && dz === 0) {
    if (now - state.lastIdleSettleAt <= IDLE_TO_WAITING_MS) return "idle";
    if (now - state.idleVariationLastSwap > IDLE_VARIATION_INTERVAL_MS) {
      state.idleVariationLastSwap = now;
      return state.stateId === "waiting" ? "review" : "waiting";
    }
    if (state.stateId === "waiting" || state.stateId === "review") return state.stateId;
    return "waiting";
  }
  if (dx > 0.25) return "running-right";
  if (dx < -0.25) return "running-left";
  return "running";
}

function advanceWaving(
  state: GroundAnimationState,
  now: number,
  dx: number,
  dz: number,
  moving: boolean,
  setState: (stateId: StateId) => void,
  pickGroundState: () => StateId
) {
  const def = STATES.waving;
  const playedFrames = ((now - state.stateStart) / 1000) * def.fps;
  if (state.waveCancelStart < 0) {
    if (moving) {
      const currentFrame = Math.min(def.frames - 1, Math.floor(playedFrames));
      const reverseTimeAlready = (def.frames - 1 - currentFrame) / def.fps;
      state.waveCancelStart = now - reverseTimeAlready * 1000;
    } else if (playedFrames >= def.frames) {
      setState(pickGroundState());
    }
    return;
  }

  const reverseElapsed = (now - state.waveCancelStart) / 1000;
  if (reverseElapsed * def.fps >= def.frames - 1) {
    state.waveCancelStart = -1;
    setState(pickGroundState());
  }
  void dx;
  void dz;
}

function advanceSit(
  state: GroundAnimationState,
  now: number,
  dx: number,
  dz: number,
  moving: boolean,
  spawnDust: DustEmitter,
  petX: number,
  petZ: number,
  setState: (stateId: StateId) => void,
  pickGroundState: () => StateId
) {
  const def = STATES.failed;
  const sitTargetFrame = Math.floor((def.frames - 1) / 2);
  const phaseElapsed = (now - state.sitPhaseStart) / 1000;
  if (state.sitPhase === "down") {
    if (moving) {
      const currentFrame = Math.min(sitTargetFrame, Math.floor(phaseElapsed * def.fps));
      const upTimeAlready = (sitTargetFrame - currentFrame) / def.fps;
      state.sitPhase = "up";
      state.sitPhaseStart = now - upTimeAlready * 1000;
    } else if (phaseElapsed * def.fps >= sitTargetFrame) {
      state.sitPhase = "hold";
      state.sitPhaseStart = now;
      spawnDust(petX, petZ, 4, { vScale: 0.55, sizeScale: 0.7, life: 0.28 });
    }
  } else if (state.sitPhase === "hold") {
    if (moving) {
      state.sitPhase = "up";
      state.sitPhaseStart = now;
    } else if (phaseElapsed >= SIT_HOLD_TIMEOUT_S) {
      state.sitPhase = "finish";
      state.sitPhaseStart = now;
    }
  } else if (state.sitPhase === "up") {
    if (phaseElapsed * def.fps >= sitTargetFrame) {
      state.sitPhase = null;
      setState(pickGroundState());
    }
  } else if (state.sitPhase === "finish") {
    const remainingFrames = def.frames - 1 - sitTargetFrame;
    if (phaseElapsed * def.fps >= remainingFrames) {
      state.sitPhase = null;
      setState(pickGroundState());
    }
  }
  void dx;
  void dz;
}
