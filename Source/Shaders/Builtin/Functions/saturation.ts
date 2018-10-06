//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec3 czm_saturation(vec3 rgb, float adjustment)\n\
{\n\
const vec3 W = vec3(0.2125, 0.7154, 0.0721);\n\
vec3 intensity = vec3(dot(rgb, W));\n\
return mix(intensity, rgb, adjustment);\n\
}\n\
";
});