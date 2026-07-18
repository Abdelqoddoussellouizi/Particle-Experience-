import { randomGaussian, randomRange, TAU } from './math';

/**
 * Generates a multi-arm spiral galaxy: particles cluster along `arms` logarithmic
 * spiral arms sweeping outward from the core, with density and vertical thickness
 * both falling off with radius so the core reads bright and dense and the arms
 * thin out toward the rim.
 */
export function createGalaxy(count: number, radius = 5.2, arms = 4): Float32Array {
  const data = new Float32Array(count * 4);
  const armOffset = TAU / arms;
  const spin = 2.6;

  for (let i = 0; i < count; i++) {
    const t = Math.pow(Math.random(), 1.5); // bias toward the core
    const r = t * radius;

    const arm = Math.floor(Math.random() * arms) * armOffset;
    const spiralAngle = r * spin + arm;
    const scatter = randomGaussian(0, 0.22) * (1 - t * 0.6);

    const angle = spiralAngle + scatter;
    const thickness = randomGaussian(0, 0.18) * (1 - t * 0.7 + 0.08);

    const idx = i * 4;
    data[idx] = Math.cos(angle) * r;
    data[idx + 1] = thickness;
    data[idx + 2] = Math.sin(angle) * r;
    data[idx + 3] = 1;
  }

  // Sprinkle a small halo of loose particles for depth.
  const haloCount = Math.floor(count * 0.06);
  for (let i = 0; i < haloCount; i++) {
    const idx = (count - 1 - i) * 4;
    const r = randomRange(radius * 0.9, radius * 1.35);
    const angle = randomRange(0, TAU);
    data[idx] = Math.cos(angle) * r;
    data[idx + 1] = randomGaussian(0, 0.5);
    data[idx + 2] = Math.sin(angle) * r;
    data[idx + 3] = 1;
  }

  return data;
}
