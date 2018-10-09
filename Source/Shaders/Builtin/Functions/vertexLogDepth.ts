//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef LOG_DEPTH\n\
varying float v_logZ;\n\
#ifdef SHADOW_MAP\n\
varying vec3 v_logPositionEC;\n\
#endif\n\
#endif\n\
\n\
void czm_updatePositionDepth() {\n\
#if defined(LOG_DEPTH) && !defined(DISABLE_GL_POSITION_LOG_DEPTH)\n\
    vec3 logPositionEC = (czm_inverseProjection * gl_Position).xyz;\n\
\n\
#ifdef SHADOW_MAP\n\
    v_logPositionEC = logPositionEC;\n\
#endif\n\
\n\
#ifdef ENABLE_GL_POSITION_LOG_DEPTH_AT_HEIGHT\n\
    if (length(logPositionEC) < 2.0e6)\n\
    {\n\
        return;\n\
    }\n\
#endif\n\
\n\
    gl_Position.z = log2(max(1e-6, 1.0 + gl_Position.w)) * czm_log2FarDistance - 1.0;\n\
    gl_Position.z *= gl_Position.w;\n\
#endif\n\
}\n\
\n\
/**\n\
 * Writes the logarithmic depth to gl_Position using the already computed gl_Position.\n\
 *\n\
 * @name czm_vertexLogDepth\n\
 * @glslFunction\n\
 */\n\
void czm_vertexLogDepth()\n\
{\n\
#ifdef LOG_DEPTH\n\
    v_logZ = 1.0 + gl_Position.w;\n\
    czm_updatePositionDepth();\n\
#endif\n\
}\n\
\n\
/**\n\
 * Writes the logarithmic depth to gl_Position using the provided clip coordinates.\n\
 * <p>\n\
 * An example use case for this function would be moving the vertex in window coordinates\n\
 * before converting back to clip coordinates. Use the original vertex clip coordinates.\n\
 * </p>\n\
 * @name czm_vertexLogDepth\n\
 * @glslFunction\n\
 *\n\
 * @param {vec4} clipCoords The vertex in clip coordinates.\n\
 *\n\
 * @example\n\
 * czm_vertexLogDepth(czm_projection * vec4(positionEyeCoordinates, 1.0));\n\
 */\n\
void czm_vertexLogDepth(vec4 clipCoords)\n\
{\n\
#ifdef LOG_DEPTH\n\
    v_logZ = 1.0 + clipCoords.w;\n\
    czm_updatePositionDepth();\n\
#endif\n\
}\n\
";
});