//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Converts an RGB color to HSL (hue, saturation, lightness)\n\
 * HSL <-> RGB conversion: {@link http://www.chilliant.com/rgb2hsv.html}\n\
 *\n\
 * @name czm_RGBToHSL\n\
 * @glslFunction\n\
 * \n\
 * @param {vec3} rgb The color in RGB.\n\
 *\n\
 * @returns {vec3} The color in HSL.\n\
 *\n\
 * @example\n\
 * vec3 hsl = czm_RGBToHSL(rgb);\n\
 * hsl.z *= 0.1;\n\
 * rgb = czm_HSLToRGB(hsl);\n\
 */\n\
 \n\
vec3 RGBtoHCV(vec3 rgb)\n\
{\n\
    // Based on work by Sam Hocevar and Emil Persson\n\
    vec4 p = (rgb.g < rgb.b) ? vec4(rgb.bg, -1.0, 2.0 / 3.0) : vec4(rgb.gb, 0.0, -1.0 / 3.0);\n\
    vec4 q = (rgb.r < p.x) ? vec4(p.xyw, rgb.r) : vec4(rgb.r, p.yzx);\n\
    float c = q.x - min(q.w, q.y);\n\
    float h = abs((q.w - q.y) / (6.0 * c + czm_epsilon7) + q.z);\n\
    return vec3(h, c, q.x);\n\
}\n\
\n\
vec3 czm_RGBToHSL(vec3 rgb)\n\
{\n\
    vec3 hcv = RGBtoHCV(rgb);\n\
    float l = hcv.z - hcv.y * 0.5;\n\
    float s = hcv.y / (1.0 - abs(l * 2.0 - 1.0) + czm_epsilon7);\n\
    return vec3(hcv.x, s, l);\n\
}\n\
";
});