import {
  GRAVITY,
  JUMP_ANTICIPATION_MS,
  JUMP_VELOCITY,
  LAND_HITSTOP_MS,
  LAND_SQUASH_MS,
  MAX_LEAN_DEG,
  SPRINT_FLASH_MS,
  STATES,
  type StateId
} from "../core/config";
import {
  isRunState,
  type PetSpriteAnimationFrame
} from "./spriteAtlas";
import {
  frameIndex,
  idleBob,
  nextFootstepFrame,
  nextLean,
  nextScaleModifiers
} from "./spriteAnimatorVisuals";
import { advanceGroundAnimation, pickGroundStateId } from "./spriteAnimatorGround";

export type DustSpawnOptions = {
  vScale?: number;
  sizeScale?: number;
  life?: number;
  yStart?: number;
};

export type DustEmitter = (fromX: number, fromZ: number, count: number, opts?: DustSpawnOptions) => void;

export type SitPhase = "down" | "hold" | "up" | "finish" | null;

export { applyAtlasFrame, applyPetSpriteVisuals, remotePetFrame } from "./spriteAtlas";

export class PetSpriteAnimator {
  stateId: StateId = "idle";
  stateStart: number;
  lastIdleSettleAt: number;
  yVel = 0;
  yPos = 0;
  onGround = true;
  jumpFacing: 1 | -1 = 1;

  private currentLean = 0;
  private airborneFrozenFrame: number | null = null;
  private pendingJumpAt = -1;
  private pendingJumpMoving = false;
  private pendingJumpSprinting = false;
  private scaleModX = 1;
  private scaleModY = 1;
  private landSquashUntil = 0;
  private hitStopUntil = 0;
  private sprintFlashUntil = 0;
  private sprintLatched = false;
  private idleVariationLastSwap = 0;
  private waveCancelStart = -1;
  private lastFootstepFrame = -1;
  private sitPhase: SitPhase = null;
  private sitPhaseStart = 0;
  private readonly maxLeanRad = (MAX_LEAN_DEG * Math.PI) / 180;

  constructor(startTime: number) {
    this.stateStart = startTime;
    this.lastIdleSettleAt = startTime;
  }

  clampDelta(now: number, dt: number) {
    return now < this.hitStopUntil ? 0 : dt;
  }

  isLandingSquashActive(now: number) {
    return now < this.landSquashUntil;
  }

  launchFromTrampoline(yVel: number, now: number) {
    this.landSquashUntil = 0;
    this.hitStopUntil = 0;
    this.yVel = yVel;
    this.yPos = 0.05;
    this.onGround = false;
    this.airborneFrozenFrame = null;
    this.setState("jumping", now);
  }

  broadcastFrame(now: number, sprinting: boolean) {
    const def = STATES[this.stateId];
    const rowIsRunning = isRunState(this.stateId);
    const fps = rowIsRunning && sprinting ? def.fps * 1.4 : def.fps;
    return {
      row: def.row,
      frame: Math.floor(((now - this.stateStart) / 1000) * fps) % def.frames,
      sprinting: rowIsRunning && sprinting
    };
  }

  advance({
    now,
    dt,
    pressed,
    dx,
    dz,
    moving,
    sprinting,
    petX,
    petZ,
    spawnDust
  }: {
    now: number;
    dt: number;
    pressed: Set<string>;
    dx: number;
    dz: number;
    moving: boolean;
    sprinting: boolean;
    petX: number;
    petZ: number;
    spawnDust: DustEmitter;
  }): PetSpriteAnimationFrame {
    if (moving) this.lastIdleSettleAt = now;

    if (sprinting && this.onGround && !this.sprintLatched) {
      this.sprintLatched = true;
      this.sprintFlashUntil = now + SPRINT_FLASH_MS;
    } else if (!sprinting) {
      this.sprintLatched = false;
    }

    if (pressed.has("Space") && this.onGround && this.pendingJumpAt < 0) {
      this.pendingJumpAt = now + JUMP_ANTICIPATION_MS;
      this.pendingJumpMoving = moving;
      this.pendingJumpSprinting = sprinting;
      if (dx > 0.05) this.jumpFacing = 1;
      else if (dx < -0.05) this.jumpFacing = -1;
      pressed.delete("Space");
    }

    if (this.pendingJumpAt >= 0 && now >= this.pendingJumpAt && this.onGround) {
      this.yVel = JUMP_VELOCITY;
      this.onGround = false;
      if (this.pendingJumpMoving) {
        const def = STATES[this.stateId];
        const elapsed = (now - this.stateStart) / 1000;
        const fps = isRunState(this.stateId) && this.pendingJumpSprinting ? def.fps * 1.4 : def.fps;
        const rawFrame = elapsed * fps;
        this.airborneFrozenFrame = def.loop
          ? Math.floor(rawFrame) % def.frames
          : Math.min(def.frames - 1, Math.floor(rawFrame));
      } else {
        this.airborneFrozenFrame = null;
        this.setState("jumping", now);
      }
      this.pendingJumpAt = -1;
    }

    if (!this.onGround) {
      this.yVel -= GRAVITY * dt;
      this.yPos += this.yVel * dt;
      if (dx > 0.05) this.jumpFacing = 1;
      else if (dx < -0.05) this.jumpFacing = -1;
      if (this.yPos <= 0) {
        this.yPos = 0;
        this.yVel = 0;
        this.onGround = true;
        this.airborneFrozenFrame = null;
        spawnDust(petX, petZ, 7, { vScale: 1.1, sizeScale: 1.05 });
        this.hitStopUntil = now + LAND_HITSTOP_MS;
        this.landSquashUntil = now + LAND_SQUASH_MS;
        const groundState = {
          stateId: this.stateId,
          stateStart: this.stateStart,
          lastIdleSettleAt: this.lastIdleSettleAt,
          idleVariationLastSwap: this.idleVariationLastSwap,
          waveCancelStart: this.waveCancelStart,
          sitPhase: this.sitPhase,
          sitPhaseStart: this.sitPhaseStart
        };
        this.setState(pickGroundStateId(groundState, dx, dz, now), now);
        this.idleVariationLastSwap = groundState.idleVariationLastSwap;
      }
    } else {
      const nextGround = advanceGroundAnimation({
        stateId: this.stateId,
        stateStart: this.stateStart,
        lastIdleSettleAt: this.lastIdleSettleAt,
        idleVariationLastSwap: this.idleVariationLastSwap,
        waveCancelStart: this.waveCancelStart,
        sitPhase: this.sitPhase,
        sitPhaseStart: this.sitPhaseStart
      }, {
        now,
        pressed,
        dx,
        dz,
        moving,
        spawnDust,
        petX,
        petZ
      });
      this.stateId = nextGround.stateId;
      this.stateStart = nextGround.stateStart;
      this.idleVariationLastSwap = nextGround.idleVariationLastSwap;
      this.waveCancelStart = nextGround.waveCancelStart;
      this.sitPhase = nextGround.sitPhase;
      this.sitPhaseStart = nextGround.sitPhaseStart;
    }

    const bobY = idleBob({
      now,
      onGround: this.onGround,
      pendingJumpAt: this.pendingJumpAt,
      stateId: this.stateId
    });
    const scale = nextScaleModifiers({
      now,
      dt,
      stateId: this.stateId,
      stateStart: this.stateStart,
      waveCancelStart: this.waveCancelStart,
      pendingJumpAt: this.pendingJumpAt,
      onGround: this.onGround,
      yVel: this.yVel,
      landSquashUntil: this.landSquashUntil,
      scaleModX: this.scaleModX,
      scaleModY: this.scaleModY
    });
    this.scaleModX = scale.scaleModX;
    this.scaleModY = scale.scaleModY;
    this.lastFootstepFrame = nextFootstepFrame({
      now,
      sprinting,
      onGround: this.onGround,
      stateId: this.stateId,
      stateStart: this.stateStart,
      lastFootstepFrame: this.lastFootstepFrame,
      spawnDust,
      petX,
      petZ
    });

    const facingFlip: 1 | -1 = !this.onGround && this.stateId === "jumping" ? this.jumpFacing : 1;
    this.currentLean = nextLean({
      dx,
      moving,
      sprinting,
      dt,
      onGround: this.onGround,
      currentLean: this.currentLean,
      maxLeanRad: this.maxLeanRad
    });
    const def = STATES[this.stateId];
    const frameIdx = frameIndex({
      now,
      sprinting,
      stateId: this.stateId,
      stateStart: this.stateStart,
      onGround: this.onGround,
      airborneFrozenFrame: this.airborneFrozenFrame,
      waveCancelStart: this.waveCancelStart,
      sitPhase: this.sitPhase,
      sitPhaseStart: this.sitPhaseStart,
      def
    });

    return {
      def,
      frameIdx,
      facingFlip,
      spriteY: this.yPos + bobY,
      scaleModX: this.scaleModX,
      scaleModY: this.scaleModY,
      lean: this.currentLean,
      flashMix: now < this.sprintFlashUntil ? Math.max(0, (this.sprintFlashUntil - now) / SPRINT_FLASH_MS) : 0
    };
  }

  private setState(next: StateId, now: number) {
    if (next === this.stateId) return;
    this.stateId = next;
    this.stateStart = now;
  }
}
