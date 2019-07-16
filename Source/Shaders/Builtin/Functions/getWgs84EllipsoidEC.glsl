/**
 * Returns the WGS84 ellipsoid, with its center at the origin of world coordinates, in eye coordinates.
 *
 * @name czm_getWgs84EllipsoidEC
 * @glslFunction
 *
 * @returns {czm_ellipsoid} The WGS84 ellipsoid, with its center at the origin of world coordinates, in eye coordinates.
 *
 * @see Ellipsoid.WGS84
 *
 * @example
 * czm_ellipsoid ellipsoid = czm_getWgs84EllipsoidEC();
 */
czm_ellipsoid czm_getWgs84EllipsoidEC()
{
    vec3 radii = vec3(6378137.0, 6378137.0, 6356752.314245);
    vec3 inverseRadii = vec3(1.0 / radii.x, 1.0 / radii.y, 1.0 / radii.z);
    vec3 inverseRadiiSquared = inverseRadii * inverseRadii;
    czm_ellipsoid temp = czm_ellipsoid(czm_view[3].xyz, radii, inverseRadii, inverseRadiiSquared);
    return temp;
}
