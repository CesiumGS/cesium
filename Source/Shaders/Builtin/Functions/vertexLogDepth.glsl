#ifdef LOG_DEPTH
varying float v_logZ;
#ifdef SHADOW_MAP
varying vec3 v_logPositionEC;
#endif
#endif

void czm_updatePositionDepth() {
#if defined(LOG_DEPTH) && !defined(DISABLE_GL_POSITION_LOG_DEPTH)
    vec3 logPositionEC = (czm_inverseProjection * gl_Position).xyz;

#ifdef SHADOW_MAP
    v_logPositionEC = logPositionEC;
#endif

#ifdef ENABLE_GL_POSITION_LOG_DEPTH_AT_HEIGHT
    if (length(logPositionEC) < 2.0e6)
    {
        return;
    }
#endif

    gl_Position.z = log2(max(1e-6, 1.0 + gl_Position.w)) * czm_log2FarDistance - 1.0;
    gl_Position.z *= gl_Position.w;
#endif
}

/**
 * Writes the logarithmic depth to gl_Position using the already computed gl_Position.
 *
 * @name czm_vertexLogDepth
 * @glslFunction
 */
void czm_vertexLogDepth()
{
#ifdef LOG_DEPTH
    v_logZ = 1.0 + gl_Position.w;
    czm_updatePositionDepth();
#endif
}

/**
 * Writes the logarithmic depth to gl_Position using the provided clip coordinates.
 * <p>
 * An example use case for this function would be moving the vertex in window coordinates
 * before converting back to clip coordinates. Use the original vertex clip coordinates.
 * </p>
 * @name czm_vertexLogDepth
 * @glslFunction
 *
 * @param {vec4} clipCoords The vertex in clip coordinates.
 *
 * @example
 * czm_vertexLogDepth(czm_projection * vec4(positionEyeCoordinates, 1.0));
 */
void czm_vertexLogDepth(vec4 clipCoords)
{
#ifdef LOG_DEPTH
    v_logZ = 1.0 + clipCoords.w;
    czm_updatePositionDepth();
#endif
}
