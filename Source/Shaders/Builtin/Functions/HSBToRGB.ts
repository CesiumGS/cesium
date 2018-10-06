//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "const vec4 K_HSB2RGB = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n\
vec3 czm_HSBToRGB(vec3 hsb)\n\
{\n\
vec3 p = abs(fract(hsb.xxx + K_HSB2RGB.xyz) * 6.0 - K_HSB2RGB.www);\n\
return hsb.z * mix(K_HSB2RGB.xxx, clamp(p - K_HSB2RGB.xxx, 0.0, 1.0), hsb.y);\n\
}\n\
";
});