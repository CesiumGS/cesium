//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec4 czm_packDepth(float depth)\n\
{\n\
vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * depth;\n\
enc = fract(enc);\n\
enc -= enc.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);\n\
return enc;\n\
}\n\
";
});