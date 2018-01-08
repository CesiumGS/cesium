// emulated noperspective
varying float v_WindowZ;

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
#ifdef GL_EXT_frag_depth
    gl_FragDepthEXT = min(v_WindowZ * gl_FragCoord.w, 1.0);
#endif
}
