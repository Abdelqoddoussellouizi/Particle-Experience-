import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useControls } from 'leva';
import { damp, clamp, mapRange, lerp } from '../utils/math';
import { interactionStore } from '../state/interactionStore';
import { handTrackingStore } from '../state/handTrackingStore';
import type { MouseState } from '../hooks/useMouse';

interface CameraRigProps {
  mouseRef: RefObject<MouseState>;
}

const MIN_DISTANCE = 8;
const MAX_DISTANCE = 26;
const DEFAULT_DISTANCE = 16;

// Wrist-to-middle-knuckle span (see handTrackingStore) at a comfortable
// close/far distance from the webcam — tuned for a hand held roughly
//20-60cm from a laptop camera, not anything more precise than that.
const HAND_SCALE_NEAR = 0.42;
const HAND_SCALE_FAR = 0.12;

// How far a full hand swing left-to-right spins the camera around the
// scene, in radians — deliberately large (~150°) so hand rotation reads as
// a real "grab and spin" control, not a subtle parallax nudge.
const HAND_ROTATION_RANGE = Math.PI * 0.85;

/**
 * Drives a perspective camera through a slow, perpetual orbit with gentle
 * vertical float, layers on a subtle mouse-parallax offset, and lets the
 * mouse wheel adjust distance — all fully damped so the camera never snaps,
 * even when the user yanks the wheel or the cursor jumps across the screen.
 *
 * When hand tracking is active it takes over two more controls on top of
 * the shared cursor position (which already pushes particles and parallaxes
 * the camera via `mouse.ndc`): hand left/right adds a large explicit orbit
 * rotation, and hand-to-camera distance (how big the hand reads in frame)
 * drives zoom. Both fade in/out through a damped `handInfluence` factor
 * rather than switching instantly, so enabling/disabling tracking — or the
 * hand leaving frame — never jolts the camera.
 */
export function CameraRig({ mouseRef }: CameraRigProps) {
  const { camera } = useThree();

  const { orbitSpeed, floatAmplitude, parallaxStrength } = useControls('Camera', {
    orbitSpeed: { value: 0.045, min: 0, max: 0.2, step: 0.005 },
    floatAmplitude: { value: 0.6, min: 0, max: 2, step: 0.05 },
    parallaxStrength: { value: 1.1, min: 0, max: 3, step: 0.05 },
  });

  const distanceTarget = useRef(DEFAULT_DISTANCE);
  const distanceCurrent = useRef(DEFAULT_DISTANCE);
  const handInfluence = useRef(0);
  const elapsed = useRef(0);
  const lookAtTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const positionTarget = useMemo(() => new THREE.Vector3(0, 0, DEFAULT_DISTANCE), []);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      distanceTarget.current = clamp(
        distanceTarget.current + event.deltaY * 0.01,
        MIN_DISTANCE,
        MAX_DISTANCE,
      );
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30);

    if (!interactionStore.paused) {
      elapsed.current += dt;
    }
    const t = elapsed.current;

    handInfluence.current = damp(handInfluence.current, handTrackingStore.detected ? 1 : 0, 4, dt);

    // Hand size (bigger = closer to the camera) drives zoom, blended against
    // whatever the wheel last set so scrolling still works once hand
    // tracking is off.
    const handDistance = mapRange(
      clamp(handTrackingStore.scale, HAND_SCALE_FAR, HAND_SCALE_NEAR),
      HAND_SCALE_FAR,
      HAND_SCALE_NEAR,
      MAX_DISTANCE,
      MIN_DISTANCE,
    );
    const effectiveDistanceTarget = lerp(distanceTarget.current, handDistance, handInfluence.current);
    distanceCurrent.current = damp(distanceCurrent.current, effectiveDistanceTarget, 4, dt);

    const mouse = mouseRef.current;
    const handRotationOffset = mouse.ndc.x * HAND_ROTATION_RANGE * handInfluence.current;
    const orbitAngle = t * orbitSpeed + handRotationOffset;

    const baseX = Math.sin(orbitAngle) * distanceCurrent.current;
    const baseZ = Math.cos(orbitAngle) * distanceCurrent.current;
    const baseY = Math.sin(t * 0.12) * floatAmplitude + Math.sin(t * 0.05) * floatAmplitude * 0.4;

    const parallaxX = mouse.ndc.x * parallaxStrength;
    const parallaxY = mouse.ndc.y * parallaxStrength * 0.6;

    positionTarget.set(baseX + parallaxX, baseY + parallaxY, baseZ);

    camera.position.x = damp(camera.position.x, positionTarget.x, 2.4, dt);
    camera.position.y = damp(camera.position.y, positionTarget.y, 2.4, dt);
    camera.position.z = damp(camera.position.z, positionTarget.z, 2.4, dt);

    camera.lookAt(lookAtTarget);
  });

  return <PerspectiveCamera makeDefault position={[0, 0, DEFAULT_DISTANCE]} fov={50} near={0.1} far={200} />;
}
