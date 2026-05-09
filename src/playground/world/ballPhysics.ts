import * as THREE from "three";
import { canOccupyPlaygroundPosition, clampToPlaygroundFloor } from "../core/collision";
import {
  BALL_FRICTION,
  BALL_GRAVITY,
  BALL_GROUND_RESTITUTION,
  BALL_PET_BUMP_BOOST,
  BALL_WALL_RESTITUTION,
  type Ball,
  type BallActor
} from "./ballTypes";

export function updateBallPhysics({
  balls,
  actors,
  floorHalf,
  dt,
  rollDelta,
  rollAxis
}: {
  balls: Ball[];
  actors: BallActor[];
  floorHalf: number;
  dt: number;
  rollDelta: THREE.Quaternion;
  rollAxis: THREE.Vector3;
}) {
  const limit = floorHalf - 0.4;

  for (const ball of balls) {
    if (!ball.simulated) {
      updateRemotePredictedBall(ball, dt, limit);
      continue;
    }
    integrateSimulatedBall({ ball, actors, limit, dt, rollDelta, rollAxis });
  }

  resolveBallCollisions(balls);
  syncBallTransforms(balls);
}

function updateRemotePredictedBall(ball: Ball, dt: number, limit: number) {
  const previousX = ball.pos.x;
  const previousZ = ball.pos.z;
  ball.vel.y -= BALL_GRAVITY * dt;
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;
  ball.pos.z += ball.vel.z * dt;
  if (ball.pos.y < ball.radius) {
    ball.pos.y = ball.radius;
    if (ball.vel.y < 0) ball.vel.y = 0;
  }
  resolveEnvironmentCollision(ball, previousX, previousZ, limit);
}

function integrateSimulatedBall({
  ball,
  actors,
  limit,
  dt,
  rollDelta,
  rollAxis
}: {
  ball: Ball;
  actors: BallActor[];
  limit: number;
  dt: number;
  rollDelta: THREE.Quaternion;
  rollAxis: THREE.Vector3;
}) {
  const previousX = ball.pos.x;
  const previousZ = ball.pos.z;
  ball.vel.y -= BALL_GRAVITY * dt;
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;
  ball.pos.z += ball.vel.z * dt;

  const onGround = ball.pos.y <= ball.radius + 0.001;
  if (ball.pos.y < ball.radius) {
    ball.pos.y = ball.radius;
    if (ball.vel.y < 0) ball.vel.y = -ball.vel.y * BALL_GROUND_RESTITUTION;
    const friction = Math.exp(-BALL_FRICTION * dt);
    ball.vel.x *= friction;
    ball.vel.z *= friction;
  }

  if (ball.pos.x > limit) { ball.pos.x = limit; ball.vel.x = -Math.abs(ball.vel.x) * BALL_WALL_RESTITUTION; }
  if (ball.pos.x < -limit) { ball.pos.x = -limit; ball.vel.x = Math.abs(ball.vel.x) * BALL_WALL_RESTITUTION; }
  if (ball.pos.z > limit) { ball.pos.z = limit; ball.vel.z = -Math.abs(ball.vel.z) * BALL_WALL_RESTITUTION; }
  if (ball.pos.z < -limit) { ball.pos.z = -limit; ball.vel.z = Math.abs(ball.vel.z) * BALL_WALL_RESTITUTION; }

  resolveEnvironmentCollision(ball, previousX, previousZ, limit);
  const beforeActorX = ball.pos.x;
  const beforeActorZ = ball.pos.z;
  resolveActorCollisions(ball, actors);
  resolveEnvironmentCollision(ball, beforeActorX, beforeActorZ, limit);
  applyRollingVisual({ ball, onGround, dt, rollDelta, rollAxis });
}

function resolveEnvironmentCollision(ball: Ball, previousX: number, previousZ: number, limit: number) {
  ball.pos.x = clampToPlaygroundFloor(ball.pos.x, limit);
  ball.pos.z = clampToPlaygroundFloor(ball.pos.z, limit);

  if (canOccupyPlaygroundPosition(ball.pos.x, ball.pos.z, ball.radius)) {
    return;
  }

  const targetX = ball.pos.x;
  const targetZ = ball.pos.z;
  const fallbackX = clampToPlaygroundFloor(previousX, limit);
  const fallbackZ = clampToPlaygroundFloor(previousZ, limit);
  const canKeepX = canOccupyPlaygroundPosition(targetX, fallbackZ, ball.radius);
  const canKeepZ = canOccupyPlaygroundPosition(fallbackX, targetZ, ball.radius);

  if (canKeepX) {
    ball.pos.z = fallbackZ;
    ball.vel.z = -ball.vel.z * BALL_WALL_RESTITUTION;
    return;
  }

  if (canKeepZ) {
    ball.pos.x = fallbackX;
    ball.vel.x = -ball.vel.x * BALL_WALL_RESTITUTION;
    return;
  }

  ball.pos.x = fallbackX;
  ball.pos.z = fallbackZ;
  ball.vel.x = -ball.vel.x * BALL_WALL_RESTITUTION;
  ball.vel.z = -ball.vel.z * BALL_WALL_RESTITUTION;
}

function resolveActorCollisions(ball: Ball, actors: BallActor[]) {
  for (const actor of actors) {
    const dx = ball.pos.x - actor.x;
    const dz = ball.pos.z - actor.z;
    const distXZ = Math.hypot(dx, dz);
    const reach = actor.radius + ball.radius;
    const ballTop = ball.pos.y + ball.radius;
    const ballLow = ball.pos.y - ball.radius;
    const vertOverlap = ballTop > actor.y && ballLow < actor.y + actor.height;
    if (distXZ >= reach || !vertOverlap) continue;

    const inv = distXZ > 0.0001 ? 1 / distXZ : 0;
    const nx = dx * inv;
    const nz = dz * inv;
    const overlap = reach - distXZ;
    ball.pos.x += nx * overlap;
    ball.pos.z += nz * overlap;
    const vDot = ball.vel.x * nx + ball.vel.z * nz;
    if (vDot < 0) {
      ball.vel.x -= vDot * nx * 1.7;
      ball.vel.z -= vDot * nz * 1.7;
    }
    const actorSpeed = Math.hypot(actor.vx, actor.vz);
    if (actorSpeed > 0.5) {
      ball.vel.x += actor.vx * BALL_PET_BUMP_BOOST;
      ball.vel.z += actor.vz * BALL_PET_BUMP_BOOST;
      ball.vel.y += 1.6;
    }
  }
}

function applyRollingVisual({
  ball,
  onGround,
  dt,
  rollDelta,
  rollAxis
}: {
  ball: Ball;
  onGround: boolean;
  dt: number;
  rollDelta: THREE.Quaternion;
  rollAxis: THREE.Vector3;
}) {
  const horizontalSpeed = Math.hypot(ball.vel.x, ball.vel.z);
  if (horizontalSpeed > 0.05) {
    rollAxis.set(ball.vel.z, 0, -ball.vel.x);
    rollAxis.normalize();
    const omega = (onGround ? 1 : 0.4) * (horizontalSpeed / ball.radius);
    rollDelta.setFromAxisAngle(rollAxis, omega * dt);
    ball.quat.premultiply(rollDelta);
  }
  if (!onGround && Math.abs(ball.vel.y) > 0.5 && horizontalSpeed < 0.4) {
    rollAxis.set(1, 0, 0);
    rollDelta.setFromAxisAngle(rollAxis, 1.2 * dt);
    ball.quat.premultiply(rollDelta);
  }
}

function resolveBallCollisions(balls: Ball[]) {
  for (let i = 0; i < balls.length; i += 1) {
    if (!balls[i].simulated) continue;
    for (let j = i + 1; j < balls.length; j += 1) {
      if (!balls[j].simulated) continue;
      const a = balls[i];
      const b = balls[j];
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dy, dz);
      const reach = a.radius + b.radius;
      if (d >= reach || d <= 0.0001) continue;

      const nx = dx / d;
      const ny = dy / d;
      const nz = dz / d;
      const overlap = (reach - d) * 0.5;
      a.pos.x -= nx * overlap; a.pos.y -= ny * overlap; a.pos.z -= nz * overlap;
      b.pos.x += nx * overlap; b.pos.y += ny * overlap; b.pos.z += nz * overlap;
      const vRel = (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * ny + (b.vel.z - a.vel.z) * nz;
      if (vRel < 0) {
        const impulse = vRel * 0.85;
        a.vel.x += impulse * nx; a.vel.y += impulse * ny; a.vel.z += impulse * nz;
        b.vel.x -= impulse * nx; b.vel.y -= impulse * ny; b.vel.z -= impulse * nz;
      }
    }
  }
}

function syncBallTransforms(balls: Ball[]) {
  for (const ball of balls) {
    ball.obj.position.set(ball.pos.x, ball.pos.y, ball.pos.z);
    ball.obj.quaternion.copy(ball.quat);
    ball.shadow.position.x = ball.pos.x;
    ball.shadow.position.z = ball.pos.z;
    const heightAboveGround = Math.max(0, ball.pos.y - ball.radius);
    const k = 1 / (1 + heightAboveGround * 0.6);
    ball.shadow.scale.set(k, k, 1);
    ball.shadowMat.opacity = 0.22 * k;
  }
}
