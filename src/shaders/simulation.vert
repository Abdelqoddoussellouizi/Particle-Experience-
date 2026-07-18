// Full-screen pass-through vertex shader for the GPU position simulation.
// Renders a single 2-triangle plane that exactly covers the render target,
// one texel per particle. `uv` and `position` come from three's PlaneGeometry.

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
