//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * DOC_TBA\n\
 *\n\
 * @name czm_geodeticSurfaceNormal\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} positionOnEllipsoid DOC_TBA\n\
 * @param {vec3} ellipsoidCenter DOC_TBA\n\
 * @param {vec3} oneOverEllipsoidRadiiSquared DOC_TBA\n\
 * \n\
 * @returns {vec3} DOC_TBA.\n\
 */\n\
vec3 czm_geodeticSurfaceNormal(vec3 positionOnEllipsoid, vec3 ellipsoidCenter, vec3 oneOverEllipsoidRadiiSquared)\n\
{\n\
    return normalize((positionOnEllipsoid - ellipsoidCenter) * oneOverEllipsoidRadiiSquared);\n\
}\n\
";
});