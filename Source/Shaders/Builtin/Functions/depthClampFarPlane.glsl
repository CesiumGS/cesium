// emulated noperspective
#ifndef LOG_DEPTH
varying float v_WindowZ;
#endif

/**
 * Clamps a vertex to the far plane.
 *
 * @name czm_depthClampFarPlane
 * @glslFunction
 *
 * @param {vec4} coords The vertex in clip coordinates.
 * @returns {vec4} The vertex clipped to the far plane.
 *
 * @example
 * gl_Position = czm_depthClampFarPlane(czm_modelViewProjection * vec4(position, 1.0));
 *
 * @see czm_writeDepthClampedToFarPlane
 */
vec4 czm_depthClampFarPlane(vec4 coords)
{
#ifndef LOG_DEPTH
    v_WindowZ = (0.5 * (coords.z / coords.w) + 0.5) * coords.w;
    coords.z = min(coords.z, coords.w);
#endif
    return coords;
}
