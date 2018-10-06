//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "varying vec4 positionEC;\n\
void main()\n\
{\n\
czm_ellipsoid ellipsoid = czm_getWgs84EllipsoidEC();\n\
vec3 direction = normalize(positionEC.xyz);\n\
czm_ray ray = czm_ray(vec3(0.0), direction);\n\
czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid);\n\
if (!czm_isEmpty(intersection))\n\
{\n\
gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);\n\
}\n\
else\n\
{\n\
discard;\n\
}\n\
czm_writeLogDepth();\n\
}\n\
";
});