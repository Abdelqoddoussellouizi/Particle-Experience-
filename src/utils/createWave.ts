import { nextSquareSize, randomRange } from './math';

/**
 * Generates particles on a regular grid spanning the XZ plane, with the initial
 * Y offset shaped by overlapping sine ripples radiating from the center. The
 * simulation shader layers organic noise on top at runtime, so this only needs
 * to supply the underlying "resting" wave shape.
 */
export function createWave(count: number, size = 9): Float32Array {
  const data = new Float32Array(count * 4);
  const gridSize = nextSquareSize(count);

  for (let i = 0; i < count; i++) {
    const gx = i % gridSize;
    const gz = Math.floor(i / gridSize);

    const u = gridSize > 1 ? gx / (gridSize - 1) : 0.5;
    const v = gridSize > 1 ? gz / (gridSize - 1) : 0.5;

    const x = (u - 0.5) * size;
    const z = (v - 0.5) * size;
    const dist = Math.sqrt(x * x + z * z);

    const ripple =
      Math.sin(dist * 1.4 - 1.2) * 0.55 + Math.sin(x * 0.6 + z * 0.35) * 0.28;

    const idx = i * 4;
    data[idx] = x + randomRange(-0.04, 0.04);
    data[idx + 1] = ripple;
    data[idx + 2] = z + randomRange(-0.04, 0.04);
    data[idx + 3] = 1;
  }

  return data;
}
