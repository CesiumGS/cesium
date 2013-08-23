/**
 * Transforms a position from window to eye coordinates.
 * The transform from window to normalized device coordinates is done using components
 * of (@link czm_viewport} and {@link czm_viewportTransformation} instead of calculating
 * the inverse of <code>czm_viewportTransformation</code>. The transformation from 
 * normalized device coordinates to clip coordinates is done using <code>positionWC.w</code>,
 * which is expected to be the scalar used in the perspective divide. The transformation
 * from clip to eye coordinates is done using {@link czm_inverseProjection}.
 *
 * @name czm_windowToEyeCoordinates
 * @glslFunction
 *
 * @param {vec4} fragmentCoordinate The position in window coordinates to transform.
 *
 * @returns {vec4} The transformed position in eye coordinates.
 *
 * @see czm_modelToWindowCoordinates
 * @see czm_eyeToWindowCoordinates
 * @see czm_inverseProjection
 * @see czm_viewport
 * @see czm_viewportTransformation
 *
 * @example
 * vec4 positionEC = czm_windowToEyeCoordinates(gl_FragCoord);
 */
vec4 czm_windowToEyeCoordinates(vec4 fragmentCoordinate)
{
    float x = 2.0 * (fragmentCoordinate.x - czm_viewport.x) / czm_viewport.z - 1.0;
    float y = 2.0 * (fragmentCoordinate.y - czm_viewport.y) / czm_viewport.w - 1.0;
    float z = (fragmentCoordinate.z - czm_viewportTransformation[3][2]) / czm_viewportTransformation[2][2];
    vec4 q = vec4(x, y, z, 1.0);
    q /= fragmentCoordinate.w;
    q = czm_inverseProjection * q;
    return q;
}
