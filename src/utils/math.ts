/** Clamp a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation between a and b. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Remap a value from one range to another. */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Framerate-independent exponential damping, matching the feel of THREE.MathUtils.damp. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Uniform random float in [min, max). */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Standard-normal random value via the Box-Muller transform. */
export function randomGaussian(mean = 0, stdDev = 1): number {
  const u1 = Math.max(Number.EPSILON, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/** Smallest square texture size (power-of-two not required) that can hold `count` texels. */
export function nextSquareSize(count: number): number {
  return Math.ceil(Math.sqrt(count));
}

export const TAU = Math.PI * 2;
