//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec3 czm_XYZToRGB(vec3 Yxy)\n\
{\n\
const mat3 XYZ2RGB = mat3( 3.2405, -0.9693,  0.0556,\n\
-1.5371,  1.8760, -0.2040,\n\
-0.4985,  0.0416,  1.0572);\n\
vec3 xyz;\n\
xyz.r = Yxy.r * Yxy.g / Yxy.b;\n\
xyz.g = Yxy.r;\n\
xyz.b = Yxy.r * (1.0 - Yxy.g - Yxy.b) / Yxy.b;\n\
return XYZ2RGB * xyz;\n\
}\n\
";
});