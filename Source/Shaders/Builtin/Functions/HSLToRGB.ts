//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Converts an HSL color (hue, saturation, lightness) to RGB\n\
 * HSL <-> RGB conversion: {@link http://www.chilliant.com/rgb2hsv.html}\n\
 *\n\
 * @name czm_HSLToRGB\n\
 * @glslFunction\n\
 * \n\
 * @param {vec3} rgb The color in HSL.\n\
 *\n\
 * @returns {vec3} The color in RGB.\n\
 *\n\
 * @example\n\
 * vec3 hsl = czm_RGBToHSL(rgb);\n\
 * hsl.z *= 0.1;\n\
 * rgb = czm_HSLToRGB(hsl);\n\
 */\n\
\n\
vec3 hueToRGB(float hue)\n\
{\n\
    float r = abs(hue * 6.0 - 3.0) - 1.0;\n\
    float g = 2.0 - abs(hue * 6.0 - 2.0);\n\
    float b = 2.0 - abs(hue * 6.0 - 4.0);\n\
    return clamp(vec3(r, g, b), 0.0, 1.0);\n\
}\n\
\n\
vec3 czm_HSLToRGB(vec3 hsl)\n\
{\n\
    vec3 rgb = hueToRGB(hsl.x);\n\
    float c = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;\n\
    return (rgb - 0.5) * c + hsl.z;\n\
}\n\
";
});