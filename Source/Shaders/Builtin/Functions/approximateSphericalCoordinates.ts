//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Approximately computes spherical coordinates given a normal.\n\
 * Uses approximate inverse trigonometry for speed and consistency,\n\
 * since inverse trigonometry can differ from vendor-to-vendor and when compared with the CPU.\n\
 *\n\
 * @name czm_approximateSphericalCoordinates\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} normal arbitrary-length normal.\n\
 *\n\
 * @returns {vec2} Approximate latitude and longitude spherical coordinates.\n\
 */\n\
vec2 czm_approximateSphericalCoordinates(vec3 normal) {\n\
    // Project into plane with vertical for latitude\n\
    float latitudeApproximation = czm_fastApproximateAtan(sqrt(normal.x * normal.x + normal.y * normal.y), normal.z);\n\
    float longitudeApproximation = czm_fastApproximateAtan(normal.x, normal.y);\n\
    return vec2(latitudeApproximation, longitudeApproximation);\n\
}\n\
";
});