//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec4 czm_translateRelativeToEye(vec3 high, vec3 low)\n\
{\n\
vec3 highDifference = high - czm_encodedCameraPositionMCHigh;\n\
vec3 lowDifference = low - czm_encodedCameraPositionMCLow;\n\
return vec4(highDifference + lowDifference, 1.0);\n\
}\n\
";
});