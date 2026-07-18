import { randomGaussian, randomRange, TAU } from './math';
import { createSphere } from './createSphere';
import { createGalaxy } from './createGalaxy';
import { createPlane } from './createPlane';
import { createWave } from './createWave';
import { createTorus } from './createTorus';

/**
 * A single 3D helical spiral climbing along Y, distinct from the flat multi-arm
 * galaxy: one continuous ribbon expanding outward as it rises.
 */
export function createSpiral(count: number, radius = 4.2, height = 7, turns = 3.5): Float32Array {
  const data = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const angle = t * TAU * turns;
    const r = radius * (0.15 + t * 0.85);

    const idx = i * 4;
    data[idx] = Math.cos(angle) * r + randomRange(-0.08, 0.08);
    data[idx + 1] = (t - 0.5) * height;
    data[idx + 2] = Math.sin(angle) * r + randomRange(-0.08, 0.08);
    data[idx + 3] = 1;
  }

  return data;
}

/**
 * A radial burst: particles thrown outward from the center with a hot, dense
 * core and a sparse power-law tail, like a freeze-framed explosion.
 */
export function createExplosion(count: number, maxRadius = 6.5): Float32Array {
  const data = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const theta = randomRange(0, TAU);
    const phi = Math.acos(randomRange(-1, 1));
    const r = Math.pow(Math.random(), 2.2) * maxRadius;

    const sinPhi = Math.sin(phi);
    const idx = i * 4;
    data[idx] = r * sinPhi * Math.cos(theta);
    data[idx + 1] = r * Math.cos(phi);
    data[idx + 2] = r * sinPhi * Math.sin(theta);
    data[idx + 3] = 1;
  }

  return data;
}

/**
 * A volumetric nebula cloud: several soft gaussian blobs scattered in space,
 * each particle belonging to one blob, producing wispy overlapping clusters
 * rather than a single uniform shape.
 */
export function createNebulaCloud(count: number, spread = 5.5, clusterCount = 6): Float32Array {
  const data = new Float32Array(count * 4);

  const clusters = Array.from({ length: clusterCount }, () => ({
    x: randomRange(-spread, spread),
    y: randomRange(-spread * 0.5, spread * 0.5),
    z: randomRange(-spread, spread),
    scale: randomRange(0.9, 2.1),
  }));

  for (let i = 0; i < count; i++) {
    const cluster = clusters[i % clusters.length];

    const idx = i * 4;
    data[idx] = cluster.x + randomGaussian(0, cluster.scale);
    data[idx + 1] = cluster.y + randomGaussian(0, cluster.scale * 0.7);
    data[idx + 2] = cluster.z + randomGaussian(0, cluster.scale);
    data[idx + 3] = 1;
  }

  return data;
}

/** Fully uniform random chaos within a cube — the "no shape" resting state. */
export function createRandomChaos(count: number, extent = 6): Float32Array {
  const data = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const idx = i * 4;
    data[idx] = randomRange(-extent, extent);
    data[idx + 1] = randomRange(-extent, extent);
    data[idx + 2] = randomRange(-extent, extent);
    data[idx + 3] = 1;
  }

  return data;
}

export type MorphTargetId =
  | 'sphere'
  | 'galaxy'
  | 'disc'
  | 'wave'
  | 'torus'
  | 'spiral'
  | 'explosion'
  | 'nebula'
  | 'chaos';

export interface MorphTargetDefinition {
  id: MorphTargetId;
  label: string;
  generate: (count: number) => Float32Array;
}

/**
 * The full registry of morph targets, cycled through in order every 6 seconds
 * (or on demand via double-click). Each entry's `generate` produces an RGBA
 * Float32Array (x, y, z, 1) ready to be uploaded into a DataTexture.
 */
export const MORPH_TARGETS: MorphTargetDefinition[] = [
  { id: 'sphere', label: 'Sphere', generate: (n) => createSphere(n) },
  { id: 'galaxy', label: 'Galaxy', generate: (n) => createGalaxy(n) },
  { id: 'disc', label: 'Flat Disc', generate: (n) => createPlane(n) },
  { id: 'wave', label: 'Wave', generate: (n) => createWave(n) },
  { id: 'torus', label: 'Torus', generate: (n) => createTorus(n) },
  { id: 'spiral', label: 'Spiral', generate: (n) => createSpiral(n) },
  { id: 'explosion', label: 'Explosion', generate: (n) => createExplosion(n) },
  { id: 'nebula', label: 'Nebula Cloud', generate: (n) => createNebulaCloud(n) },
  { id: 'chaos', label: 'Random Chaos', generate: (n) => createRandomChaos(n) },
];
