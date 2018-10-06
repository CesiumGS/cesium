//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec2 czm_approximateSphericalCoordinates(vec3 normal) {\n\
float latitudeApproximation = czm_fastApproximateAtan(sqrt(normal.x * normal.x + normal.y * normal.y), normal.z);\n\
float longitudeApproximation = czm_fastApproximateAtan(normal.x, normal.y);\n\
return vec2(latitudeApproximation, longitudeApproximation);\n\
}\n\
";
});