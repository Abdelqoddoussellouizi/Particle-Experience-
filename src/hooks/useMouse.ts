import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { damp } from '../utils/math';
import { handTrackingStore } from '../state/handTrackingStore';

export interface MouseState {
  /** Smoothed cursor position in world space, raycast onto the interaction plane. */
  world: THREE.Vector3;
  /** Smoothed normalized device coordinates, range [-1, 1]. */
  ndc: THREE.Vector2;
  /** Eased 0..1 presence flag — fades out when the pointer leaves the window. */
  active: number;
}

/**
 * Tracks the pointer as a raycasted world-space position on a plane in front of
 * the particle cluster, fully damped so both the position and its "active" state
 * ease smoothly instead of snapping. Must be called from a component rendered
 * inside the R3F <Canvas>.
 */
export function useMouse(planeZ = 0): RefObject<MouseState> {
  const { camera } = useThree();

  const stateRef = useRef<MouseState>({
    world: new THREE.Vector3(),
    ndc: new THREE.Vector2(),
    active: 0,
  });

  const ndcTarget = useRef(new THREE.Vector2());
  const activeTarget = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ), [planeZ]);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      ndcTarget.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
      activeTarget.current = 1;
    };
    const handleLeave = () => {
      activeTarget.current = 0;
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerdown', handleMove, { passive: true });
    document.addEventListener('mouseleave', handleLeave);
    window.addEventListener('blur', handleLeave);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerdown', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
      window.removeEventListener('blur', handleLeave);
    };
  }, []);

  useFrame((_, delta) => {
    const s = stateRef.current;
    const dt = Math.min(delta, 1 / 30);

    // When hand tracking is active and currently sees a hand, it overrides
    // the pointer target every frame. The moment it stops (disabled, or the
    // hand leaves frame), this simply stops firing and whatever the mouse/
    // touch listeners last set takes back over — no mode switch to manage.
    if (handTrackingStore.detected) {
      ndcTarget.current.set(handTrackingStore.ndcX, handTrackingStore.ndcY);
      activeTarget.current = 1;
    }

    s.ndc.x = damp(s.ndc.x, ndcTarget.current.x, 6, dt);
    s.ndc.y = damp(s.ndc.y, ndcTarget.current.y, 6, dt);

    raycaster.setFromCamera(s.ndc, camera);
    const hit = raycaster.ray.intersectPlane(plane, hitPoint);

    if (hit) {
      s.world.x = damp(s.world.x, hit.x, 8, dt);
      s.world.y = damp(s.world.y, hit.y, 8, dt);
      s.world.z = damp(s.world.z, hit.z, 8, dt);
    }

    s.active = damp(s.active, activeTarget.current, activeTarget.current ? 6 : 3, dt);
  });

  return stateRef;
}
