//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec4 czm_eyeToWindowCoordinates(vec4 positionEC)\n\
{\n\
vec4 q = czm_projection * positionEC;\n\
q.xyz /= q.w;\n\
q.xyz = (czm_viewportTransformation * vec4(q.xyz, 1.0)).xyz;\n\
return q;\n\
}\n\
";
});