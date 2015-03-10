    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * Returns the WGS84 ellipsoid, with its center at the origin of world coordinates, in eye coordinates.\n\
 *\n\
 * @name czm_getWgs84EllipsoidEC\n\
 * @glslFunction\n\
 *\n\
 * @returns {czm_ellipsoid} The WGS84 ellipsoid, with its center at the origin of world coordinates, in eye coordinates.\n\
 *\n\
 * @see Ellipsoid.WGS84\n\
 *\n\
 * @example\n\
 * czm_ellipsoid ellipsoid = czm_getWgs84EllipsoidEC();\n\
 */\n\
czm_ellipsoid czm_getWgs84EllipsoidEC()\n\
{\n\
    vec3 radii = vec3(6378137.0, 6378137.0, 6356752.314245);\n\
    vec3 inverseRadii = vec3(1.0 / radii.x, 1.0 / radii.y, 1.0 / radii.z);\n\
    vec3 inverseRadiiSquared = inverseRadii * inverseRadii;\n\
    czm_ellipsoid temp = czm_ellipsoid(czm_view[3].xyz, radii, inverseRadii, inverseRadiiSquared);\n\
    return temp;\n\
}\n\
";
});