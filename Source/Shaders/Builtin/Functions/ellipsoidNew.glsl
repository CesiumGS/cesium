/**
 * DOC_TBA
 *
 * @name czm_ellipsoidNew
 * @glslFunction
 *
 */
czm_ellipsoid czm_ellipsoidNew(vec3 center, vec3 radii)
{
    vec3 inverseRadii = vec3(1.0 / radii.x, 1.0 / radii.y, 1.0 / radii.z);
    vec3 inverseRadiiSquared = inverseRadii * inverseRadii;
    czm_ellipsoid temp = czm_ellipsoid(center, radii, inverseRadii, inverseRadiiSquared);
    return temp;
}
