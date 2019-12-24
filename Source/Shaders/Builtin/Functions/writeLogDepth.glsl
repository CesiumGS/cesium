#ifdef LOG_DEPTH
varying float v_logZ;
#endif

/**
 * Writes the fragment depth to the logarithmic depth buffer.
 * <p>
 * Use this when the vertex shader does not call {@link czm_vertexlogDepth}, for example, when
 * ray-casting geometry using a full screen quad.
 * </p>
 * @name czm_writeLogDepth
 * @glslFunction
 *
 * @param {float} logZ The w coordinate of the vertex in clip coordinates plus 1.0.
 *
 * @example
 * czm_writeLogDepth((czm_projection * v_positionEyeCoordinates).w + 1.0);
 */
void czm_writeLogDepth(float logZ)
{
#if defined(GL_EXT_frag_depth) && defined(LOG_DEPTH) && !defined(DISABLE_LOG_DEPTH_FRAGMENT_WRITE)
    float halfLogFarDistance = czm_log2FarDistance * 0.5;
    float depth = log2(logZ);
    if (depth < czm_log2NearDistance) {
        discard;
    }
    gl_FragDepthEXT = depth * halfLogFarDistance;
#endif
}

/**
 * Writes the fragment depth to the logarithmic depth buffer.
 * <p>
 * Use this when the vertex shader calls {@link czm_vertexlogDepth}.
 * </p>
 *
 * @name czm_writeLogDepth
 * @glslFunction
 */
void czm_writeLogDepth() {
#ifdef LOG_DEPTH
    czm_writeLogDepth(v_logZ);
#endif
}
