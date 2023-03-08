//This file is automatically rebuilt by the Cesium build process.
export default "#ifdef LOG_DEPTH\n\
// 1.0 at the near plane, increasing linearly from there.\n\
varying float v_depthFromNearPlusOne;\n\
#ifdef SHADOW_MAP\n\
varying vec3 v_logPositionEC;\n\
#endif\n\
#endif\n\
\n\
vec4 czm_updatePositionDepth(vec4 coords) {\n\
#if defined(LOG_DEPTH)\n\
\n\
#ifdef SHADOW_MAP\n\
    vec3 logPositionEC = (czm_inverseProjection * coords).xyz;\n\
    v_logPositionEC = logPositionEC;\n\
#endif\n\
\n\
    // With the very high far/near ratios used with the logarithmic depth\n\
    // buffer, floating point rounding errors can cause linear depth values\n\
    // to end up on the wrong side of the far plane, even for vertices that\n\
    // are really nowhere near it. Since we always write a correct logarithmic\n\
    // depth value in the fragment shader anyway, we just need to make sure\n\
    // such errors don't cause the primitive to be clipped entirely before\n\
    // we even get to the fragment shader.\n\
    coords.z = clamp(coords.z / coords.w, -1.0, 1.0) * coords.w;\n\
#endif\n\
\n\
    return coords;\n\
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
    v_depthFromNearPlusOne = (gl_Position.w - czm_currentFrustum.x) + 1.0;\n\
    gl_Position = czm_updatePositionDepth(gl_Position);\n\
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
    v_depthFromNearPlusOne = (clipCoords.w - czm_currentFrustum.x) + 1.0;\n\
    czm_updatePositionDepth(clipCoords);\n\
#endif\n\
}\n\
";
