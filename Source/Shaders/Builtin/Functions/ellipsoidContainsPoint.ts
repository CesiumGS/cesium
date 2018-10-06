//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "bool czm_ellipsoidContainsPoint(czm_ellipsoid ellipsoid, vec3 point)\n\
{\n\
vec3 scaled = ellipsoid.inverseRadii * (czm_inverseModelView * vec4(point, 1.0)).xyz;\n\
return (dot(scaled, scaled) <= 1.0);\n\
}\n\
";
});