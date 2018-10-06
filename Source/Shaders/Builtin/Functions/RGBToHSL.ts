//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec3 RGBtoHCV(vec3 rgb)\n\
{\n\
vec4 p = (rgb.g < rgb.b) ? vec4(rgb.bg, -1.0, 2.0 / 3.0) : vec4(rgb.gb, 0.0, -1.0 / 3.0);\n\
vec4 q = (rgb.r < p.x) ? vec4(p.xyw, rgb.r) : vec4(rgb.r, p.yzx);\n\
float c = q.x - min(q.w, q.y);\n\
float h = abs((q.w - q.y) / (6.0 * c + czm_epsilon7) + q.z);\n\
return vec3(h, c, q.x);\n\
}\n\
vec3 czm_RGBToHSL(vec3 rgb)\n\
{\n\
vec3 hcv = RGBtoHCV(rgb);\n\
float l = hcv.z - hcv.y * 0.5;\n\
float s = hcv.y / (1.0 - abs(l * 2.0 - 1.0) + czm_epsilon7);\n\
return vec3(hcv.x, s, l);\n\
}\n\
";
});