//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * DOC_TBA\n\
 *\n\
 * @name czm_ellipsoidNew\n\
 * @glslFunction\n\
 *\n\
 */\n\
czm_ellipsoid czm_ellipsoidNew(vec3 center, vec3 radii)\n\
{\n\
    vec3 inverseRadii = vec3(1.0 / radii.x, 1.0 / radii.y, 1.0 / radii.z);\n\
    vec3 inverseRadiiSquared = inverseRadii * inverseRadii;\n\
    czm_ellipsoid temp = czm_ellipsoid(center, radii, inverseRadii, inverseRadiiSquared);\n\
    return temp;\n\
}\n\
";
});