//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec3 czm_multiplyWithColorBalance(vec3 left, vec3 right)\n\
{\n\
const vec3 W = vec3(0.2125, 0.7154, 0.0721);\n\
vec3 target = left * right;\n\
float leftLuminance = dot(left, W);\n\
float rightLuminance = dot(right, W);\n\
float targetLuminance = dot(target, W);\n\
return ((leftLuminance + rightLuminance) / (2.0 * targetLuminance)) * target;\n\
}\n\
";
});