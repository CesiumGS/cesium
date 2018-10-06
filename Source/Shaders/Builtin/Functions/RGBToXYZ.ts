//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec3 czm_RGBToXYZ(vec3 rgb)\n\
{\n\
const mat3 RGB2XYZ = mat3(0.4124, 0.2126, 0.0193,\n\
0.3576, 0.7152, 0.1192,\n\
0.1805, 0.0722, 0.9505);\n\
vec3 xyz = RGB2XYZ * rgb;\n\
vec3 Yxy;\n\
Yxy.r = xyz.g;\n\
float temp = dot(vec3(1.0), xyz);\n\
Yxy.gb = xyz.rg / temp;\n\
return Yxy;\n\
}\n\
";
});