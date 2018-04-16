// emulated noperspective
#ifndef LOG_DEPTH
varying float v_WindowZ;
#endif
/**
 * Clamps a vertex to the far plane by writing the fragments depth.
 * <p>
 * The shader must enable the GL_EXT_frag_depth extension.
 * </p>
 *
 * @name czm_writeDepthClampedToFarPlane
 * @glslFunction
 *
 * @example
 * gl_FragColor = color;
 * czm_writeDepthClampedToFarPlane();
 *
 * @see czm_depthClampFarPlane
 */
void czm_writeDepthClampedToFarPlane()
{
#if defined(GL_EXT_frag_depth) && !defined(LOG_DEPTH)
    gl_FragDepthEXT = min(v_WindowZ * gl_FragCoord.w, 1.0);
#endif
}
