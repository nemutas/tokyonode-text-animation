#version 300 es
precision highp float;

flat in int vDiscard;
out vec4 outColor;

void main() {
  if (vDiscard == 0 || 1.0 < length(gl_PointCoord * 2.0 - 1.0)) discard;

  float sm = 1.0 - smoothstep(0.7, 1.0, length(gl_PointCoord * 2.0 - 1.0));
  outColor = vec4(vec3(0), sm);
}