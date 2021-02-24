// emulated noperspective
#if defined(GL_EXT_frag_depth) && !defined(LOG_DEPTH)
varying float v_WindowZ;
#endif

/**
 * Emulates GL_DEPTH_CLAMP. Clamps a fragment to the near and far plane
 * by writing the fragment's depth. See czm_depthClamp for more details.
 * <p>
 * The shader must enable the GL_EXT_frag_depth extension.
 * </p>
 *
 * @name czm_writeDepthClamp
 * @glslFunction
 *
 * @example
 * gl_FragColor = color;
 * czm_writeDepthClamp();
 *
 * @see czm_depthClamp
 */
void czm_writeDepthClamp()
{
#if defined(GL_EXT_frag_depth) && !defined(LOG_DEPTH)
    gl_FragDepthEXT = clamp(v_WindowZ * gl_FragCoord.w, 0.0, 1.0);
#endif
}
