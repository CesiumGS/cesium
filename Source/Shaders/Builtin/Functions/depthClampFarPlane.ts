//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "// emulated noperspective\n\
#ifndef LOG_DEPTH\n\
varying float v_WindowZ;\n\
#endif\n\
\n\
/**\n\
 * Clamps a vertex to the far plane.\n\
 *\n\
 * @name czm_depthClampFarPlane\n\
 * @glslFunction\n\
 *\n\
 * @param {vec4} coords The vertex in clip coordinates.\n\
 * @returns {vec4} The vertex clipped to the far plane.\n\
 *\n\
 * @example\n\
 * gl_Position = czm_depthClampFarPlane(czm_modelViewProjection * vec4(position, 1.0));\n\
 *\n\
 * @see czm_writeDepthClampedToFarPlane\n\
 */\n\
vec4 czm_depthClampFarPlane(vec4 coords)\n\
{\n\
#ifndef LOG_DEPTH\n\
    v_WindowZ = (0.5 * (coords.z / coords.w) + 0.5) * coords.w;\n\
    coords.z = min(coords.z, coords.w);\n\
#endif\n\
    return coords;\n\
}\n\
";
});