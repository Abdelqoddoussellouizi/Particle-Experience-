import { randomRange, TAU } from './math';

/**
 * Generates a flat circular disc of particles lying in the XZ plane with a very
 * thin vertical jitter so it still catches light and noise motion instead of
 * looking like a perfectly dead sheet.
 */
export function createPlane(count: number, radius = 5): Float32Array {
  const data = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    // sqrt-distributed radius keeps particle density uniform across the disc area
    const r = Math.sqrt(Math.random()) * radius;
    const angle = randomRange(0, TAU);

    const idx = i * 4;
    data[idx] = Math.cos(angle) * r;
    data[idx + 1] = randomRange(-0.06, 0.06);
    data[idx + 2] = Math.sin(angle) * r;
    data[idx + 3] = 1;
  }

  return data;
}
