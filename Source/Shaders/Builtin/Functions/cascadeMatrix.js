//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "\n\
uniform mat4 shadowMap_cascadeMatrices[4];\n\
\n\
mat4 czm_cascadeMatrix(vec4 weights)\n\
{\n\
    return shadowMap_cascadeMatrices[0] * weights.x +\n\
           shadowMap_cascadeMatrices[1] * weights.y +\n\
           shadowMap_cascadeMatrices[2] * weights.z +\n\
           shadowMap_cascadeMatrices[3] * weights.w;\n\
}\n\
";
});