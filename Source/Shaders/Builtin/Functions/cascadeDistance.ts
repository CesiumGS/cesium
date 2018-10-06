//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform vec4 shadowMap_cascadeDistances;\n\
float czm_cascadeDistance(vec4 weights)\n\
{\n\
return dot(shadowMap_cascadeDistances, weights);\n\
}\n\
";
});