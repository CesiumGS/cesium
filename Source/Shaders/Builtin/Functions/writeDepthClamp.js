//This file is automatically rebuilt by the Cesium build process.
export default "// emulated noperspective\n\
#if defined(GL_EXT_frag_depth) && !defined(LOG_DEPTH)\n\
varying float v_WindowZ;\n\
#endif\n\
\n\
/**\n\
 * Emulates GL_DEPTH_CLAMP. Clamps a fragment to the near and far plane\n\
 * by writing the fragment's depth. See czm_depthClamp for more details.\n\
 * <p>\n\
 * The shader must enable the GL_EXT_frag_depth extension.\n\
 * </p>\n\
 *\n\
 * @name czm_writeDepthClamp\n\
 * @glslFunction\n\
 *\n\
 * @example\n\
 * gl_FragColor = color;\n\
 * czm_writeDepthClamp();\n\
 *\n\
 * @see czm_depthClamp\n\
 */\n\
void czm_writeDepthClamp()\n\
{\n\
#if defined(GL_EXT_frag_depth) && !defined(LOG_DEPTH)\n\
    gl_FragDepthEXT = clamp(v_WindowZ * gl_FragCoord.w, 0.0, 1.0);\n\
#endif\n\
}\n\
";
