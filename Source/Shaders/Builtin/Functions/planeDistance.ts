//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_planeDistance(vec4 plane, vec3 point) {\n\
return (dot(plane.xyz, point) + plane.w);\n\
}\n\
float czm_planeDistance(vec3 planeNormal, float planeDistance, vec3 point) {\n\
return (dot(planeNormal, point) + planeDistance);\n\
}\n\
";
});