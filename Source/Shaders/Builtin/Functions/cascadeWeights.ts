//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform vec4 shadowMap_cascadeSplits[2];\n\
vec4 czm_cascadeWeights(float depthEye)\n\
{\n\
vec4 near = step(shadowMap_cascadeSplits[0], vec4(depthEye));\n\
vec4 far = step(depthEye, shadowMap_cascadeSplits[1]);\n\
return near * far;\n\
}\n\
";
});