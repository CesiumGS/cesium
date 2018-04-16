//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Converts an HSB color (hue, saturation, brightness) to RGB\n\
 * HSB <-> RGB conversion with minimal branching: {@link http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl}\n\
 *\n\
 * @name czm_HSBToRGB\n\
 * @glslFunction\n\
 * \n\
 * @param {vec3} hsb The color in HSB.\n\
 *\n\
 * @returns {vec3} The color in RGB.\n\
 *\n\
 * @example\n\
 * vec3 hsb = czm_RGBToHSB(rgb);\n\
 * hsb.z *= 0.1;\n\
 * rgb = czm_HSBToRGB(hsb);\n\
 */\n\
\n\
const vec4 K_HSB2RGB = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n\
\n\
vec3 czm_HSBToRGB(vec3 hsb)\n\
{\n\
    vec3 p = abs(fract(hsb.xxx + K_HSB2RGB.xyz) * 6.0 - K_HSB2RGB.www);\n\
    return hsb.z * mix(K_HSB2RGB.xxx, clamp(p - K_HSB2RGB.xxx, 0.0, 1.0), hsb.y);\n\
}\n\
";
});