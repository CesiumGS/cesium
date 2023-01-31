/**
 * DOC_TBA
 *
 * @name czm_ellipsoidWgs84TextureCoordinates
 * @glslFunction
 */
vec2 czm_ellipsoidWgs84TextureCoordinates(vec3 normal)
{
    return vec2(atan(normal.y, normal.x) * czm_oneOverTwoPi + 0.5, asin(normal.z) * czm_oneOverPi + 0.5);
}
