//This file is automatically rebuilt by the Cesium build process.
export default "// emulated noperspective\n\
#if defined(GL_EXT_frag_depth) && !defined(LOG_DEPTH)\n\
varying float v_WindowZ;\n\
#endif\n\
\n\
/**\n\
 * Emulates GL_DEPTH_CLAMP, which is not available in WebGL 1 or 2.\n\
 * GL_DEPTH_CLAMP clamps geometry that is outside the near and far planes, \n\
 * capping the shadow volume. More information here: \n\
 * https://www.khronos.org/registry/OpenGL/extensions/ARB/ARB_depth_clamp.txt.\n\
 *\n\
 * When GL_EXT_frag_depth is available we emulate GL_DEPTH_CLAMP by ensuring \n\
 * no geometry gets clipped by setting the clip space z value to 0.0 and then\n\
 * sending the unaltered screen space z value (using emulated noperspective\n\
 * interpolation) to the frag shader where it is clamped to [0,1] and then\n\
 * written with gl_FragDepth (see czm_writeDepthClamp). This technique is based on:\n\
 * https://stackoverflow.com/questions/5960757/how-to-emulate-gl-depth-clamp-nv.\n\
 *\n\
 * When GL_EXT_frag_depth is not available, which is the case on some mobile \n\
 * devices, we must attempt to fix this only in the vertex shader. \n\
 * The approach is to clamp the z value to the far plane, which closes the \n\
 * shadow volume but also distorts the geometry, so there can still be artifacts\n\
 * on frustum seams.\n\
 *\n\
 * @name czm_depthClamp\n\
 * @glslFunction\n\
 *\n\
 * @param {vec4} coords The vertex in clip coordinates.\n\
 * @returns {vec4} The modified vertex.\n\
 *\n\
 * @example\n\
 * gl_Position = czm_depthClamp(czm_modelViewProjection * vec4(position, 1.0));\n\
 *\n\
 * @see czm_writeDepthClamp\n\
 */\n\
vec4 czm_depthClamp(vec4 coords)\n\
{\n\
#ifndef LOG_DEPTH\n\
#ifdef GL_EXT_frag_depth\n\
    v_WindowZ = (0.5 * (coords.z / coords.w) + 0.5) * coords.w;\n\
    coords.z = 0.0;\n\
#else\n\
    coords.z = min(coords.z, coords.w);\n\
#endif\n\
#endif\n\
    return coords;\n\
}\n\
";
