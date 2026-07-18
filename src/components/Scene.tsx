import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { interactionStore } from '../state/interactionStore';
import { useMouse } from '../hooks/useMouse';
import { ParticleSimulation } from './ParticleSimulation';
import { CameraRig } from './CameraRig';
import { CursorLight } from './CursorLight';

const fogVertexShader = `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fogFragmentShader = `
  precision highp float;
  varying vec3 vPosition;
  uniform float uTime;
  uniform vec3 uColor;

  void main() {
    vec3 dir = normalize(vPosition);
    float n = sin(dir.x * 2.3 + uTime * 0.05)
      * sin(dir.y * 1.7 - uTime * 0.04)
      * sin(dir.z * 2.9 + uTime * 0.03);
    float band = smoothstep(-1.0, 1.0, n);
    float intensity = 0.03 + band * 0.045;
    gl_FragColor = vec4(uColor * intensity, 1.0);
  }
`;

/** A huge inverted sphere enclosing the whole scene, its surface brightness
 *  drifting almost imperceptibly over time — reads as a very faint, slowly
 *  animated fog no matter how the camera orbits. */
function FogDome() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const elapsed = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#04222b') },
    }),
    [],
  );

  useFrame((_, rawDelta) => {
    if (!interactionStore.paused) {
      elapsed.current += Math.min(rawDelta, 1 / 30);
    }
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = elapsed.current;
    }
  });

  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[150, 24, 24]} />
      <shaderMaterial
        ref={materialRef}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={fogVertexShader}
        fragmentShader={fogFragmentShader}
      />
    </mesh>
  );
}

/**
 * The full 3D scene graph: background dome + stars, camera rig, the GPU
 * particle simulation, and the cursor glow. A single `useMouse` instance is
 * created here and shared downward so there is only one raycaster and one
 * set of pointer listeners for the whole experience.
 */
export function Scene() {
  const mouseRef = useMouse(0);

  return (
    <>
      <color attach="background" args={['#000000']} />
      <FogDome />
      <Stars radius={110} depth={70} count={2200} factor={2.2} saturation={0} fade speed={0.35} />
      <CameraRig mouseRef={mouseRef} />
      <ParticleSimulation mouseRef={mouseRef} />
      <CursorLight mouseRef={mouseRef} />
    </>
  );
}
