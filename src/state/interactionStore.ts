/**
 * A tiny mutable, non-reactive store for cross-component signals that fire on
 * every frame or on rapid input (pause toggle, morph fast-forward). Kept
 * outside React state deliberately: these are read inside useFrame loops at
 * 120fps, and routing them through React state/context would trigger
 * unnecessary re-renders of the whole scene graph on every keystroke.
 */
export interface InteractionStore {
  /** Space bar: freezes the GPU simulation, camera drift, and flicker clocks. */
  paused: boolean;
  /**
   * Double-click: a one-shot signal telling the simulation to hurry the
   * current morph transition to completion instead of waiting out the full
   * cycle. Consumed (reset to false) by ParticleSimulation the next frame.
   */
  fastForwardMorph: boolean;
}

export const interactionStore: InteractionStore = {
  paused: false,
  fastForwardMorph: false,
};
