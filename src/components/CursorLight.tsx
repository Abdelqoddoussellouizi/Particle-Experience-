import { useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { damp } from '../utils/math';
import type { MouseState } from '../hooks/useMouse';

interface CursorLightProps {
  mouseRef: RefObject<MouseState>;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    float dist = length(vUv - 0.5);
    float glow = smoothstep(0.5, 0.0, dist);
    glow = pow(glow, 1.6);
    gl_FragColor = vec4(uColor, glow * uOpacity);
  }
`;

/**
 * A soft cyan glow that follows the raycasted cursor position, fading in and
 * out with `mouse.active`. Purely decorative (the particle repulsion itself
 * lives entirely in the GPU simulation) — it just gives the interaction a
 * visible, premium point of origin.
 */
export function CursorLight({ mouseRef }: CursorLightProps) {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#00e5ff') },
      uOpacity: { value: 0 },
    }),
    [],
  );

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30);
    const mouse = mouseRef.current;

    if (meshRef.current) {
      meshRef.current.position.lerp(mouse.world, 1 - Math.exp(-10 * dt));
      meshRef.current.quaternion.copy(camera.quaternion);
    }

    if (materialRef.current) {
      const targetOpacity = mouse.active * 0.55;
      materialRef.current.uniforms.uOpacity.value = damp(
        materialRef.current.uniforms.uOpacity.value,
        targetOpacity,
        6,
        dt,
      );
    }
  });

  return (
    <mesh ref={meshRef} renderOrder={10}>
      <planeGeometry args={[2.2, 2.2]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
