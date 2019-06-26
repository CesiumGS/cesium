/**
 * DOC_TBA
 *
 * @name czm_ellipsoidContainsPoint
 * @glslFunction
 *
 */
bool czm_ellipsoidContainsPoint(czm_ellipsoid ellipsoid, vec3 point)
{
    vec3 scaled = ellipsoid.inverseRadii * (czm_inverseModelView * vec4(point, 1.0)).xyz;
    return (dot(scaled, scaled) <= 1.0);
}
