/**
 * A tiny mutable, non-reactive store bridging the webcam hand-tracking loop
 * (its own requestAnimationFrame loop, driven by MediaPipe) and useMouse's
 * useFrame loop (driven by R3F). Kept outside React state for the same
 * reason as interactionStore: this is read/written up to 60 times a second
 * and has no business triggering component re-renders.
 *
 * When `detected` is true, useMouse overwrites its pointer target with
 * (ndcX, ndcY) every frame, so the hand becomes the input source for
 * particle repulsion and camera parallax with zero changes to any
 * downstream consumer. The moment tracking is disabled or the hand leaves
 * frame, `detected` drops back to false and the mouse/touch pointer
 * silently resumes control.
 */
export interface HandTrackingStore {
  ndcX: number;
  ndcY: number;
  detected: boolean;
  /**
   * Normalized wrist-to-middle-knuckle span (bigger when the hand is closer
   * to the camera). CameraRig maps this to zoom distance, so moving your
   * hand toward/away from the webcam zooms the camera in/out.
   */
  scale: number;
}

export const handTrackingStore: HandTrackingStore = {
  ndcX: 0,
  ndcY: 0,
  detected: false,
  scale: 0.22,
};
