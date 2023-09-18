//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Converts an RGB color to HSB (hue, saturation, brightness)\n\
 * HSB <-> RGB conversion with minimal branching: {@link http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl}\n\
 *\n\
 * @name czm_RGBToHSB\n\
 * @glslFunction\n\
 * \n\
 * @param {vec3} rgb The color in RGB.\n\
 *\n\
 * @returns {vec3} The color in HSB.\n\
 *\n\
 * @example\n\
 * vec3 hsb = czm_RGBToHSB(rgb);\n\
 * hsb.z *= 0.1;\n\
 * rgb = czm_HSBToRGB(hsb);\n\
 */\n\
\n\
const vec4 K_RGB2HSB = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n\
\n\
vec3 czm_RGBToHSB(vec3 rgb)\n\
{\n\
    vec4 p = mix(vec4(rgb.bg, K_RGB2HSB.wz), vec4(rgb.gb, K_RGB2HSB.xy), step(rgb.b, rgb.g));\n\
    vec4 q = mix(vec4(p.xyw, rgb.r), vec4(rgb.r, p.yzx), step(p.x, rgb.r));\n\
\n\
    float d = q.x - min(q.w, q.y);\n\
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + czm_epsilon7)), d / (q.x + czm_epsilon7), q.x);\n\
}\n\
";
