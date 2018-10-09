//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform float u_glowLengthTS;\n\
uniform float u_radiusTS;\n\
\n\
varying vec2 v_textureCoordinates;\n\
\n\
vec2 rotate(vec2 p, vec2 direction)\n\
{\n\
    return vec2(p.x * direction.x - p.y * direction.y, p.x * direction.y + p.y * direction.x);\n\
}\n\
\n\
vec4 addBurst(vec2 position, vec2 direction)\n\
{\n\
    vec2 rotatedPosition = rotate(position, direction) * vec2(25.0, 0.75);\n\
    float radius = length(rotatedPosition);\n\
    float burst = 1.0 - smoothstep(0.0, 0.55, radius);\n\
\n\
    return vec4(burst);\n\
}\n\
\n\
void main()\n\
{\n\
    vec2 position = v_textureCoordinates - vec2(0.5);\n\
    float radius = length(position);\n\
    float surface = step(radius, u_radiusTS);\n\
    vec4 color = vec4(1.0, 1.0, surface + 0.2, surface);\n\
\n\
    float glow = 1.0 - smoothstep(0.0, 0.55, radius);\n\
    color.ba += mix(vec2(0.0), vec2(1.0), glow) * 0.75;\n\
\n\
    vec4 burst = vec4(0.0);\n\
\n\
    // The following loop has been manually unrolled for speed, to\n\
    // avoid sin() and cos().\n\
    //\n\
    //for (float i = 0.4; i < 3.2; i += 1.047) {\n\
    //    vec2 direction = vec2(sin(i), cos(i));\n\
    //    burst += 0.4 * addBurst(position, direction);\n\
    //\n\
    //    direction = vec2(sin(i - 0.08), cos(i - 0.08));\n\
    //    burst += 0.3 * addBurst(position, direction);\n\
    //}\n\
\n\
    burst += 0.4 * addBurst(position, vec2(0.38942,  0.92106));  // angle == 0.4\n\
    burst += 0.4 * addBurst(position, vec2(0.99235,  0.12348));  // angle == 0.4 + 1.047\n\
    burst += 0.4 * addBurst(position, vec2(0.60327, -0.79754));  // angle == 0.4 + 1.047 * 2.0\n\
\n\
    burst += 0.3 * addBurst(position, vec2(0.31457,  0.94924));  // angle == 0.4 - 0.08\n\
    burst += 0.3 * addBurst(position, vec2(0.97931,  0.20239));  // angle == 0.4 + 1.047 - 0.08\n\
    burst += 0.3 * addBurst(position, vec2(0.66507, -0.74678));  // angle == 0.4 + 1.047 * 2.0 - 0.08\n\
\n\
    // End of manual loop unrolling.\n\
\n\
    color += clamp(burst, vec4(0.0), vec4(1.0)) * 0.15;\n\
    \n\
    gl_FragColor = clamp(color, vec4(0.0), vec4(1.0));\n\
}\n\
";
});