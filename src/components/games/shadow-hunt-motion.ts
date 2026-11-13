import { canOccupy, groundHeight, type BodyFootprint } from "./shadow-hunt-room";

export const WALK_SPEED = 4;
export const RUN_SPEED = 6.3;
const GRAVITY = 18;
const JUMP_SPEED = 6.7;

type Position = { x: number; y: number; z: number };
export type Motion = { vx: number; vy: number; vz: number; grounded: boolean };

export function newMotion(): Motion {
  return { vx: 0, vy: 0, vz: 0, grounded: true };
}

export function stepMotion(
  position: Position,
  motion: Motion,
  input: { x: number; z: number; run: boolean; jump: boolean },
  delta: number,
  body?: BodyFootprint,
) {
  if (input.jump && motion.grounded) {
    motion.vy = JUMP_SPEED;
    motion.grounded = false;
  }

  const inputLength = Math.hypot(input.x, input.z);
  const speed = input.run ? RUN_SPEED : WALK_SPEED;
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
    // Airborne players can clear a low bench. Tall furniture and walls stay solid.
    if (canOccupy(x, position.z, 0.38, position.y, body)) position.x = x;
    else motion.vx = 0;
    if (canOccupy(position.x, z, 0.38, position.y, body)) position.z = z;
    else motion.vz = 0;

    const floor = groundHeight(position.x, position.z, body);
    if (motion.grounded && position.y > floor + 0.001) motion.grounded = false;
    if (!motion.grounded) {
      motion.vy -= GRAVITY * dt;
      const nextY = position.y + motion.vy * dt;
      if (motion.vy <= 0 && nextY <= floor && position.y >= floor) {
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
