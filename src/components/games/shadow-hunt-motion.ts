import { canOccupy, groundHeight, STAIR_STEP, type BodyFootprint, type WallClimb } from "./shadow-hunt-room";

export const WALK_SPEED = 4;
export const RUN_SPEED = 6.3;
const GRAVITY = 18;
const JUMP_SPEED = 6.7;

type Position = { x: number; y: number; z: number };
export type Motion = { vx: number; vy: number; vz: number; grounded: boolean };

export function newMotion(): Motion {
  return { vx: 0, vy: 0, vz: 0, grounded: true };
}

export function stepWallClimb(position: Position, motion: Motion, wall: WallClimb, direction: number, delta: number) {
  const align = 1 - Math.exp(-16 * delta);
  const nextX = position.x + (wall.x - position.x) * align;
  const nextZ = position.z + (wall.z - position.z) * align;
  const previousY = position.y;
  if (canOccupy(nextX, nextZ, 0.38, position.y)) {
    position.x = nextX;
    position.z = nextZ;
    position.y = Math.max(0, Math.min(wall.top, position.y + direction * 2.35 * delta));
  }
  motion.vx = motion.vy = motion.vz = 0;
  motion.grounded = false;
  return delta > 0 ? (position.y - previousY) / delta : 0;
}

export function stepMotion(
  position: Position,
  motion: Motion,
  input: { x: number; z: number; run: boolean; jump: boolean; crouch?: boolean },
  delta: number,
  body?: BodyFootprint,
) {
  if (input.jump && motion.grounded) {
    motion.vy = JUMP_SPEED;
    motion.grounded = false;
  }

  const inputLength = Math.hypot(input.x, input.z);
  const speed = input.crouch ? WALK_SPEED * 0.58 : input.run ? RUN_SPEED : WALK_SPEED;
  const scale = inputLength ? speed / inputLength : 0;
  const response = motion.grounded ? (inputLength ? 18 : 24) : (inputLength ? 8 : 12);
  const blend = 1 - Math.exp(-response * delta);
  motion.vx += (input.x * scale - motion.vx) * blend;
  motion.vz += (input.z * scale - motion.vz) * blend;

  // Keep collision steps small during both sprinting and slower frames.
  const steps = Math.max(1, Math.ceil(delta / (1 / 120)));
  const dt = delta / steps;
  const fromX = position.x, fromZ = position.z;
  for (let i = 0; i < steps; i++) {
    const x = position.x + motion.vx * dt;
    const z = position.z + motion.vz * dt;
    const stepUp = motion.grounded && !body ? STAIR_STEP : 0;
    if (canOccupy(x, position.z, 0.38, position.y, body, stepUp)) position.x = x;
    else motion.vx = 0;
    const supportX = groundHeight(position.x, position.z, body, position.y + stepUp + 0.001);
    if (motion.grounded && supportX > position.y) position.y = supportX;
    if (canOccupy(position.x, z, 0.38, position.y, body, stepUp)) position.z = z;
    else motion.vz = 0;

    const floor = groundHeight(position.x, position.z, body, position.y + stepUp + 0.001);
    if (motion.grounded && floor > position.y) position.y = floor;
    if (motion.grounded && position.y > floor + 0.001) motion.grounded = false;
    if (!motion.grounded) {
      motion.vy -= GRAVITY * dt;
      const nextY = position.y + motion.vy * dt;
      if (motion.vy <= 0 && nextY <= floor && position.y >= floor - 0.001) {
        position.y = floor;
        motion.vy = 0;
        motion.grounded = true;
      } else {
        position.y = Math.max(0, nextY);
      }
    }
  }
  return { x: position.x - fromX, z: position.z - fromZ };
}
