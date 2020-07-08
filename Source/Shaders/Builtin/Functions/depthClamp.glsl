// emulated noperspective
#ifndef LOG_DEPTH
varying float v_WindowZ;
#endif

/**
 * Clamps a vertex to the near and far planes.
 *
 * @name czm_depthClamp
 * @glslFunction
 *
 * @param {vec4} coords The vertex in clip coordinates.
 * @returns {vec4} The vertex clipped to the near and far planes.
 *
 * @example
 * gl_Position = czm_depthClamp(czm_modelViewProjection * vec4(position, 1.0));
 *
 * @see czm_writeDepthClamp
 */
vec4 czm_depthClamp(vec4 coords)
{
#ifndef LOG_DEPTH
    v_WindowZ = (0.5 * (coords.z / coords.w) + 0.5) * coords.w;
    coords.z = clamp(coords.z, -coords.w, +coords.w);
#endif
    return coords;
}
