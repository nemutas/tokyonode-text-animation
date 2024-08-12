#version 300 es
precision highp int;

in vec3 position;
in int visible;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

flat out int vDiscard;

void main() {
	vDiscard = visible;

	gl_PointSize = 9.0;
	gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}