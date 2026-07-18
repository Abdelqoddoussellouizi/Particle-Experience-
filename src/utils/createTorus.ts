import { randomRange, TAU } from './math';

/**
 * Generates particles filling the volume of a torus (donut), parameterized by
 * a major radius (distance from center to tube center) and a minor radius
 * (tube thickness), with slight jitter so it reads as a soft volumetric ring.
 */
export function createTorus(count: number, majorRadius = 3.4, minorRadius = 1.15): Float32Array {
  const data = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const theta = randomRange(0, TAU); // around the main ring
    const phi = randomRange(0, TAU); // around the tube
    const tubeR = minorRadius * Math.sqrt(Math.random());

    const x = (majorRadius + tubeR * Math.cos(phi)) * Math.cos(theta);
    const y = tubeR * Math.sin(phi);
    const z = (majorRadius + tubeR * Math.cos(phi)) * Math.sin(theta);

    const idx = i * 4;
    data[idx] = x;
    data[idx + 1] = y;
    data[idx + 2] = z;
    data[idx + 3] = 1;
  }

  return data;
}
