//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Computes the luminance of a color. \n\
 *\n\
 * @name czm_luminance\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} rgb The color.\n\
 * \n\
 * @returns {float} The luminance.\n\
 *\n\
 * @example\n\
 * float light = czm_luminance(vec3(0.0)); // 0.0\n\
 * float dark = czm_luminance(vec3(1.0));  // ~1.0 \n\
 */\n\
float czm_luminance(vec3 rgb)\n\
{\n\
    // Algorithm from Chapter 10 of Graphics Shaders.\n\
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);\n\
    return dot(rgb, W);\n\
}\n\
";
