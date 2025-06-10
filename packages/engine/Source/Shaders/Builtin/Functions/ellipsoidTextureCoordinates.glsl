/**
 * Approximate uv coordinates based on the ellipsoid normal.
 *
 * @name czm_ellipsoidTextureCoordinates
 * @glslFunction
 */
vec2 czm_ellipsoidTextureCoordinates(vec3 normal)
{
    return vec2(atan(normal.y, normal.x) * czm_oneOverTwoPi + 0.5, asin(normal.z) * czm_oneOverPi + 0.5);
}
