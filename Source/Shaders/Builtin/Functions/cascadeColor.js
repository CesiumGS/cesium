//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "\n\
vec4 czm_cascadeColor(vec4 weights)\n\
{\n\
    return vec4(1.0, 0.0, 0.0, 1.0) * weights.x +\n\
           vec4(0.0, 1.0, 0.0, 1.0) * weights.y +\n\
           vec4(0.0, 0.0, 1.0, 1.0) * weights.z +\n\
           vec4(1.0, 0.0, 1.0, 1.0) * weights.w;\n\
}\n\
";
});