import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, extend } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import { useControls, folder } from 'leva';
import simulationVertexShader from '../shaders/simulation.vert';
import simulationFragmentShader from '../shaders/simulation.frag';
import { MORPH_TARGETS } from '../utils/createShapes';
import { easeInOutCubic } from '../utils/easing';
import { interactionStore } from '../state/interactionStore';
import type { MouseState } from '../hooks/useMouse';
import { ParticleMaterialImpl } from './ParticleMaterial';

// ParticleMaterialImpl is only referenced in a type position below
// (`typeof ParticleMaterialImpl`), which esbuild's per-file TS transform
// can mistake for a type-only import and elide entirely — silently
// skipping the `extend()` side effect in ParticleMaterial.tsx and breaking
// the <particleMaterialImpl> JSX tag at runtime. Calling extend() again
// here (idempotent) forces a genuine value import and guarantees
// registration regardless of import order.
extend({ ParticleMaterialImpl });

/** Grid side length for the position data textures: 320 * 320 = 102,400 particles. */
export const GRID_SIZE = 320;
export const PARTICLE_COUNT = GRID_SIZE * GRID_SIZE;

const CYCLE_SECONDS = 6;
const FAST_FORWARD_SECONDS = 0.6;

const FBO_OPTIONS = {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  format: THREE.RGBAFormat,
  type: THREE.FloatType,
  stencilBuffer: false,
  depthBuffer: false,
} as const;

function createDataTexture(data: Float32Array, size: number): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

interface ParticleAttributes {
  positions: Float32Array;
  uv: Float32Array;
  random: Float32Array;
}

/** Precomputes the static per-particle attributes: a texel UV for every particle
 *  (mapping it to its pixel in the position textures) and a random seed used
 *  for flicker/size variation. `position` is unused by the shader but still
 *  required so three.js knows the vertex count for the draw call. */
function buildParticleAttributes(size: number): ParticleAttributes {
  const count = size * size;
  const positions = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const random = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    uv[i * 2] = (x + 0.5) / size;
    uv[i * 2 + 1] = (y + 0.5) / size;
    random[i] = Math.random();
  }

  return { positions, uv, random };
}

/**
 * Owns the entire GPU particle pipeline:
 *  1. A ping-pong pair of floating-point render targets holding particle
 *     positions (one texel per particle).
 *  2. A full-screen simulation pass (simulation.vert/frag) that reads the
 *     previous frame's positions and writes the next frame's, blending
 *     between morph targets, adding organic noise, and applying cursor
 *     repulsion — entirely on the GPU.
 *  3. The visible <points> cloud, whose vertex shader samples the freshly
 *     simulated position texture instead of a static position attribute.
 */
interface ParticleSimulationProps {
  mouseRef: RefObject<MouseState>;
}

export function ParticleSimulation({ mouseRef }: ParticleSimulationProps) {
  const { gl } = useThree();

  const { noiseStrength, noiseFrequency, followSpeed, mouseRadius, mouseStrength, pointSize, color } =
    useControls('Particles', {
      Motion: folder({
        noiseStrength: { value: 0.55, min: 0, max: 2, step: 0.01 },
        noiseFrequency: { value: 0.18, min: 0.02, max: 0.6, step: 0.01 },
        followSpeed: { value: 1.4, min: 0.2, max: 4, step: 0.05 },
      }),
      Interaction: folder({
        mouseRadius: { value: 1.8, min: 0.2, max: 5, step: 0.05 },
        mouseStrength: { value: 2.6, min: 0, max: 8, step: 0.05 },
      }),
      Appearance: folder({
        pointSize: { value: 3, min: 0.5, max: 14, step: 0.25 },
        color: { value: '#00e5ff' },
      }),
    });

  const attributes = useMemo(() => buildParticleAttributes(GRID_SIZE), []);

  const shapeTextures = useMemo(
    () => MORPH_TARGETS.map((target) => createDataTexture(target.generate(PARTICLE_COUNT), GRID_SIZE)),
    [],
  );

  useEffect(() => {
    return () => {
      shapeTextures.forEach((texture) => texture.dispose());
    };
  }, [shapeTextures]);

  const targetA = useFBO(GRID_SIZE, GRID_SIZE, FBO_OPTIONS);
  const targetB = useFBO(GRID_SIZE, GRID_SIZE, FBO_OPTIONS);

  const readTarget = useRef(targetA);
  const writeTarget = useRef(targetB);

  const simScene = useMemo(() => new THREE.Scene(), []);
  const simCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  const simMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: simulationVertexShader,
        fragmentShader: simulationFragmentShader,
        uniforms: {
          uPositionTexture: { value: shapeTextures[0] },
          uTargetA: { value: shapeTextures[0] },
          uTargetB: { value: shapeTextures[1 % shapeTextures.length] },
          uMorphT: { value: 0 },
          uTime: { value: 0 },
          uDelta: { value: 0 },
          uPaused: { value: 0 },
          uMouseWorld: { value: new THREE.Vector3(9999, 9999, 9999) },
          uMouseActive: { value: 0 },
          uMouseRadius: { value: mouseRadius },
          uMouseStrength: { value: mouseStrength },
          uNoiseStrength: { value: noiseStrength },
          uNoiseFrequency: { value: noiseFrequency },
          uFollowSpeed: { value: followSpeed },
        },
      }),
    // Intentionally only depends on shapeTextures: the tunable uniforms are
    // pushed to the material every frame in useFrame below, so recreating
    // this material whenever a Leva slider moves would be wasteful churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shapeTextures],
  );

  useEffect(() => {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, simMaterial);
    simScene.add(mesh);
    return () => {
      simScene.remove(mesh);
      geometry.dispose();
    };
  }, [simScene, simMaterial]);

  useEffect(() => {
    return () => {
      simMaterial.dispose();
    };
  }, [simMaterial]);

  const pointsMaterialRef = useRef<InstanceType<typeof ParticleMaterialImpl>>(null);

  const progressRef = useRef(0);
  const rateRef = useRef(1 / CYCLE_SECONDS);
  const currentIndexRef = useRef(0);
  const nextIndexRef = useRef(1 % shapeTextures.length);
  const elapsedRef = useRef(0);
  const bootstrappedRef = useRef(false);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30);
    const paused = interactionStore.paused;

    if (!paused) {
      elapsedRef.current += dt;
    }

    // One-time bootstrap: seed the read target with the first shape so the
    // very first visible frame isn't sampling an empty texture.
    if (!bootstrappedRef.current) {
      simMaterial.uniforms.uPositionTexture.value = shapeTextures[0];
      simMaterial.uniforms.uTargetA.value = shapeTextures[0];
      simMaterial.uniforms.uTargetB.value = shapeTextures[0];
      simMaterial.uniforms.uMorphT.value = 0;
      simMaterial.uniforms.uDelta.value = 0;
      simMaterial.uniforms.uPaused.value = 0;
      gl.setRenderTarget(readTarget.current);
      gl.render(simScene, simCamera);
      gl.setRenderTarget(null);
      bootstrappedRef.current = true;
    }

    if (interactionStore.fastForwardMorph) {
      rateRef.current = 1 / FAST_FORWARD_SECONDS;
      interactionStore.fastForwardMorph = false;
    }

    if (!paused) {
      progressRef.current += rateRef.current * dt;
    }

    if (progressRef.current >= 1) {
      progressRef.current = 0;
      rateRef.current = 1 / CYCLE_SECONDS;
      currentIndexRef.current = nextIndexRef.current;
      nextIndexRef.current = (nextIndexRef.current + 1) % shapeTextures.length;
    }

    const eased = easeInOutCubic(Math.min(progressRef.current, 1));

    simMaterial.uniforms.uPositionTexture.value = readTarget.current.texture;
    simMaterial.uniforms.uTargetA.value = shapeTextures[currentIndexRef.current];
    simMaterial.uniforms.uTargetB.value = shapeTextures[nextIndexRef.current];
    simMaterial.uniforms.uMorphT.value = eased;
    simMaterial.uniforms.uTime.value = elapsedRef.current;
    simMaterial.uniforms.uDelta.value = paused ? 0 : dt;
    simMaterial.uniforms.uPaused.value = paused ? 1 : 0;
    simMaterial.uniforms.uMouseWorld.value.copy(mouseRef.current.world);
    simMaterial.uniforms.uMouseActive.value = mouseRef.current.active;
    simMaterial.uniforms.uMouseRadius.value = mouseRadius;
    simMaterial.uniforms.uMouseStrength.value = mouseStrength;
    simMaterial.uniforms.uNoiseStrength.value = noiseStrength;
    simMaterial.uniforms.uNoiseFrequency.value = noiseFrequency;
    simMaterial.uniforms.uFollowSpeed.value = followSpeed;

    gl.setRenderTarget(writeTarget.current);
    gl.render(simScene, simCamera);
    gl.setRenderTarget(null);

    if (pointsMaterialRef.current) {
      pointsMaterialRef.current.uPositionTexture = writeTarget.current.texture;
      pointsMaterialRef.current.uTime = elapsedRef.current;
      pointsMaterialRef.current.uSize = pointSize;
      pointsMaterialRef.current.uPixelRatio = gl.getPixelRatio();
      pointsMaterialRef.current.uColor.set(color);
    }

    const previousRead = readTarget.current;
    readTarget.current = writeTarget.current;
    writeTarget.current = previousRead;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attributes.positions, 3]} />
        <bufferAttribute attach="attributes-aUv" args={[attributes.uv, 2]} />
        <bufferAttribute attach="attributes-aRandom" args={[attributes.random, 1]} />
      </bufferGeometry>
      <particleMaterialImpl
        ref={pointsMaterialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
