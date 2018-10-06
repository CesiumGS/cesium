//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform float u_glowLengthTS;\n\
uniform float u_radiusTS;\n\
varying vec2 v_textureCoordinates;\n\
vec2 rotate(vec2 p, vec2 direction)\n\
{\n\
return vec2(p.x * direction.x - p.y * direction.y, p.x * direction.y + p.y * direction.x);\n\
}\n\
vec4 addBurst(vec2 position, vec2 direction)\n\
{\n\
vec2 rotatedPosition = rotate(position, direction) * vec2(25.0, 0.75);\n\
float radius = length(rotatedPosition);\n\
float burst = 1.0 - smoothstep(0.0, 0.55, radius);\n\
return vec4(burst);\n\
}\n\
void main()\n\
{\n\
vec2 position = v_textureCoordinates - vec2(0.5);\n\
float radius = length(position);\n\
float surface = step(radius, u_radiusTS);\n\
vec4 color = vec4(1.0, 1.0, surface + 0.2, surface);\n\
float glow = 1.0 - smoothstep(0.0, 0.55, radius);\n\
color.ba += mix(vec2(0.0), vec2(1.0), glow) * 0.75;\n\
vec4 burst = vec4(0.0);\n\
burst += 0.4 * addBurst(position, vec2(0.38942,  0.92106));\n\
burst += 0.4 * addBurst(position, vec2(0.99235,  0.12348));\n\
burst += 0.4 * addBurst(position, vec2(0.60327, -0.79754));\n\
burst += 0.3 * addBurst(position, vec2(0.31457,  0.94924));\n\
burst += 0.3 * addBurst(position, vec2(0.97931,  0.20239));\n\
burst += 0.3 * addBurst(position, vec2(0.66507, -0.74678));\n\
color += clamp(burst, vec4(0.0), vec4(1.0)) * 0.15;\n\
gl_FragColor = clamp(color, vec4(0.0), vec4(1.0));\n\
}\n\
";
});