//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Adjusts the saturation of a color.\n\
 * \n\
 * @name czm_saturation\n\
 * @glslFunction\n\
 * \n\
 * @param {vec3} rgb The color.\n\
 * @param {float} adjustment The amount to adjust the saturation of the color.\n\
 *\n\
 * @returns {float} The color with the saturation adjusted.\n\
 *\n\
 * @example\n\
 * vec3 greyScale = czm_saturation(color, 0.0);\n\
 * vec3 doubleSaturation = czm_saturation(color, 2.0);\n\
 */\n\
vec3 czm_saturation(vec3 rgb, float adjustment)\n\
{\n\
    // Algorithm from Chapter 16 of OpenGL Shading Language\n\
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);\n\
    vec3 intensity = vec3(dot(rgb, W));\n\
    return mix(intensity, rgb, adjustment);\n\
}\n\
";
