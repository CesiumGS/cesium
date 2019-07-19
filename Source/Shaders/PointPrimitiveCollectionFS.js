//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "varying vec4 v_color;\n\
varying vec4 v_outlineColor;\n\
varying float v_innerPercent;\n\
varying float v_pixelDistance;\n\
varying vec4 v_pickColor;\n\
\n\
void main()\n\
{\n\
    // The distance in UV space from this fragment to the center of the point, at most 0.5.\n\
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));\n\
    // The max distance stops one pixel shy of the edge to leave space for anti-aliasing.\n\
    float maxDistance = max(0.0, 0.5 - v_pixelDistance);\n\
    float wholeAlpha = 1.0 - smoothstep(maxDistance, 0.5, distanceToCenter);\n\
    float innerAlpha = 1.0 - smoothstep(maxDistance * v_innerPercent, 0.5 * v_innerPercent, distanceToCenter);\n\
\n\
    vec4 color = mix(v_outlineColor, v_color, innerAlpha);\n\
    color.a *= wholeAlpha;\n\
\n\
// Fully transparent parts of the billboard are not pickable.\n\
#if !defined(OPAQUE) && !defined(TRANSLUCENT)\n\
    if (color.a < 0.005)   // matches 0/255 and 1/255\n\
    {\n\
        discard;\n\
    }\n\
#else\n\
// The billboard is rendered twice. The opaque pass discards translucent fragments\n\
// and the translucent pass discards opaque fragments.\n\
#ifdef OPAQUE\n\
    if (color.a < 0.995)   // matches < 254/255\n\
    {\n\
        discard;\n\
    }\n\
#else\n\
    if (color.a >= 0.995)  // matches 254/255 and 255/255\n\
    {\n\
        discard;\n\
    }\n\
#endif\n\
#endif\n\
\n\
    gl_FragColor = czm_gammaCorrect(color);\n\
    czm_writeLogDepth();\n\
}\n\
";
});