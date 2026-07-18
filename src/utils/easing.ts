/**
 * A small set of hand-rolled easing functions (t in [0, 1] -> eased in [0, 1]).
 * Used to shape the morph-target blend and camera motion so nothing ever moves linearly
 * or teleports — every transition accelerates and decelerates smoothly.
 */

export type EasingFn = (t: number) => number;

export const linear: EasingFn = (t) => t;

export const easeInOutSine: EasingFn = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeInOutQuint: EasingFn = (t) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

export const easeOutExpo: EasingFn = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export const easeOutBack: EasingFn = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
