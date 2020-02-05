#ifdef LOG_DEPTH
varying float v_depthFromNearPlusOne;
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
#if defined(GL_EXT_frag_depth) && defined(LOG_DEPTH)
    float farDepth = 1.0 - czm_currentFrustum.x + czm_currentFrustum.y;

    // Discard the vertex if it's not between the near and far planes.
    // We allow a bit of epsilon on the near plane comparison because a 1.0
    // from the vertex shader (indicating the vertex should be _on_ the near
    // plane) will not necessarily come here as exactly 1.0.
    if (logZ <= 0.9999999 || logZ > farDepth) {
        discard;
    }

    gl_FragDepthEXT = log2(logZ) / log2(farDepth);

#ifdef DISABLE_LOG_DEPTH_FRAGMENT_WRITE
    // Polygon offset: m * factor + r * units
    // m = sqrt(dZdX^2 + dZdY^2);
    float x = dFdx(logZ);
    float y = dFdx(logZ);
    float m = sqrt(x * x + y * y);
    float offset = m * 5.0 + 5.0 * 1e-7;
    gl_FragDepthEXT += offset;
#endif

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
    czm_writeLogDepth(v_depthFromNearPlusOne);
#endif
}
