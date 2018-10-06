//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec3 hueToRGB(float hue)\n\
{\n\
float r = abs(hue * 6.0 - 3.0) - 1.0;\n\
float g = 2.0 - abs(hue * 6.0 - 2.0);\n\
float b = 2.0 - abs(hue * 6.0 - 4.0);\n\
return clamp(vec3(r, g, b), 0.0, 1.0);\n\
}\n\
vec3 czm_HSLToRGB(vec3 hsl)\n\
{\n\
vec3 rgb = hueToRGB(hsl.x);\n\
float c = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;\n\
return (rgb - 0.5) * c + hsl.z;\n\
}\n\
";
});