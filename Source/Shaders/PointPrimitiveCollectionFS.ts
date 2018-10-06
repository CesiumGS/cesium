//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "varying vec4 v_color;\n\
varying vec4 v_outlineColor;\n\
varying float v_innerPercent;\n\
varying float v_pixelDistance;\n\
varying vec4 v_pickColor;\n\
void main()\n\
{\n\
float distanceToCenter = length(gl_PointCoord - vec2(0.5));\n\
float maxDistance = max(0.0, 0.5 - v_pixelDistance);\n\
float wholeAlpha = 1.0 - smoothstep(maxDistance, 0.5, distanceToCenter);\n\
float innerAlpha = 1.0 - smoothstep(maxDistance * v_innerPercent, 0.5 * v_innerPercent, distanceToCenter);\n\
vec4 color = mix(v_outlineColor, v_color, innerAlpha);\n\
color.a *= wholeAlpha;\n\
#if !defined(OPAQUE) && !defined(TRANSLUCENT)\n\
if (color.a < 0.005)\n\
{\n\
discard;\n\
}\n\
#else\n\
#ifdef OPAQUE\n\
if (color.a < 0.995)\n\
{\n\
discard;\n\
}\n\
#else\n\
if (color.a >= 0.995)\n\
{\n\
discard;\n\
}\n\
#endif\n\
#endif\n\
gl_FragColor = color;\n\
czm_writeLogDepth();\n\
}\n\
";
});