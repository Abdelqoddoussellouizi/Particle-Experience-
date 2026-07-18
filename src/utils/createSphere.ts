import { randomRange } from './math';

/**
 * Generates `count` particle positions distributed evenly across a sphere surface
 * using a Fibonacci (golden-angle) spiral, with a thin radial jitter so the sphere
 * reads as a soft volumetric shell rather than a flat mathematical surface.
 *
 * Returns a Float32Array laid out as RGBA texels (x, y, z, 1) so it can be uploaded
 * directly into a DataTexture consumed by the GPU simulation shader.
 */
export function createSphere(count: number, radius = 4.2): Float32Array {
  const data = new Float32Array(count * 4);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;

    const jitter = 1 + randomRange(-0.035, 0.035);
    const r = radius * jitter;

    const x = Math.cos(theta) * radiusAtY * r;
    const z = Math.sin(theta) * radiusAtY * r;

    const idx = i * 4;
    data[idx] = x;
    data[idx + 1] = y * r;
    data[idx + 2] = z;
    data[idx + 3] = 1;
  }

  return data;
}
