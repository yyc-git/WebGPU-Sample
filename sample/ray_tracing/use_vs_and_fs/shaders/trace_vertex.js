export const trace_vertex = `#version 450
      precision highp float;
      precision highp int;

layout(location=0) in vec2 position;
layout(location=0) out vec2 v_position;

void main() {
    v_position = position;
    gl_Position = vec4(2.0 * position - 1.0, 0, 1);
}`