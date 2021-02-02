//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Converts a color from RGB space to linear space.\n\
 *\n\
 * @name czm_gammaCorrect\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} color The color in RGB space.\n\
 * @returns {vec3} The color in linear space.\n\
 */\n\
vec3 czm_gammaCorrect(vec3 color) {\n\
#ifdef HDR\n\
    color = pow(color, vec3(czm_gamma));\n\
#endif\n\
    return color;\n\
}\n\
\n\
vec4 czm_gammaCorrect(vec4 color) {\n\
#ifdef HDR\n\
    color.rgb = pow(color.rgb, vec3(czm_gamma));\n\
#endif\n\
    return color;\n\
}\n\
";
