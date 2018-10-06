//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "const vec4 K_RGB2HSB = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n\
vec3 czm_RGBToHSB(vec3 rgb)\n\
{\n\
vec4 p = mix(vec4(rgb.bg, K_RGB2HSB.wz), vec4(rgb.gb, K_RGB2HSB.xy), step(rgb.b, rgb.g));\n\
vec4 q = mix(vec4(p.xyw, rgb.r), vec4(rgb.r, p.yzx), step(p.x, rgb.r));\n\
float d = q.x - min(q.w, q.y);\n\
return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + czm_epsilon7)), d / (q.x + czm_epsilon7), q.x);\n\
}\n\
";
});