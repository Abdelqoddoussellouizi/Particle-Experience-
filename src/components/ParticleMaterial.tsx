import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import type { ThreeElement } from '@react-three/fiber';
import vertexShader from '../shaders/particle.vert';
import fragmentShader from '../shaders/particle.frag';

/**
 * The visible particle point-sprite material. It carries almost no state of
 * its own — every particle's position lives in `uPositionTexture`, a texture
 * produced each frame by the GPU simulation pass in ParticleSimulation. This
 * material only turns that texture into soft, glowing, additively-blended dots.
 */
export const ParticleMaterialImpl = shaderMaterial(
  {
    uPositionTexture: null as THREE.Texture | null,
    uTime: 0,
    uSize: 3,
    uPixelRatio: 1,
    uColor: new THREE.Color('#00E5FF'),
  },
  vertexShader,
  fragmentShader,
);

extend({ ParticleMaterialImpl });

declare module '@react-three/fiber' {
  interface ThreeElements {
    particleMaterialImpl: ThreeElement<typeof ParticleMaterialImpl>;
  }
}
