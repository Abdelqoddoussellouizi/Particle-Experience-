// Renders each GL point as a soft, radially-faded circle with an additive
// glow core. Combined with THREE.AdditiveBlending + depthWrite=false on the
// material, overlapping particles brighten each other naturally instead of
// z-fighting or producing hard sprite edges.

precision highp float;

uniform vec3 uColor;

varying float vAlpha;
varying float vFlicker;
varying float vDepth;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float dist = length(centered);

  if (dist > 0.5) {
    discard;
  }

  float core = smoothstep(0.5, 0.0, dist);
  float glow = pow(core, 2.2);

  float depthFade = mix(1.0, 0.2, vDepth);
  float alpha = glow * vAlpha * vFlicker * depthFade;

  vec3 color = uColor * (1.0 + core * 0.7);

  gl_FragColor = vec4(color, alpha);
}
