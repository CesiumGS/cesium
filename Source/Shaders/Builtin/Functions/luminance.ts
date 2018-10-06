//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_luminance(vec3 rgb)\n\
{\n\
const vec3 W = vec3(0.2125, 0.7154, 0.0721);\n\
return dot(rgb, W);\n\
}\n\
";
});