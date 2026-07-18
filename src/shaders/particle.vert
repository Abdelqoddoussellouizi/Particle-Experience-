// Reads each particle's simulated world position out of the position texture
// (written by simulation.frag this same frame) and projects it as a single
// GL point, with perspective-correct size attenuation, per-particle size
// variation, and a gentle flicker driven purely by a per-particle random seed
// so 100k+ particles never pulse in lockstep.

precision highp float;

attribute vec2 aUv;
attribute float aRandom;

uniform sampler2D uPositionTexture;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;

varying float vAlpha;
varying float vFlicker;
varying float vDepth;

void main() {
  vec3 simulatedPosition = texture2D(uPositionTexture, aUv).xyz;

  vec4 mvPosition = modelViewMatrix * vec4(simulatedPosition, 1.0);

  float flicker = 0.72 + 0.28 * sin(uTime * (1.6 + aRandom * 3.2) + aRandom * 6.2831853);
  vFlicker = flicker;

  // With 100k+ particles packed into a modest-radius volume, points must
  // stay close to the average inter-particle spacing (a few pixels) or
  // additive blending saturates the whole cluster to solid white. Bloom
  // supplies the glow spread — the raw point size should stay tiny.
  float sizeVariation = 0.45 + aRandom * 1.35;
  float perspectiveSize = uSize * sizeVariation * uPixelRatio * (9.0 / max(-mvPosition.z, 0.001));
  gl_PointSize = clamp(perspectiveSize, 1.0, 14.0);

  vDepth = clamp((-mvPosition.z - 4.0) / 34.0, 0.0, 1.0);
  vAlpha = 1.0 - vDepth * 0.85;

  gl_Position = projectionMatrix * mvPosition;
}
