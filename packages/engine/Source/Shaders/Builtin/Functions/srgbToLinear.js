//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Converts an sRGB color to a linear RGB color.\n\
 *\n\
 * @param {vec3|vec4} srgbIn The color in sRGB space\n\
 * @returns {vec3|vec4} The color in linear color space. The vector type matches the input.\n\
 */\n\
vec3 czm_srgbToLinear(vec3 srgbIn)\n\
{\n\
    return pow(srgbIn, vec3(2.2));\n\
}\n\
\n\
vec4 czm_srgbToLinear(vec4 srgbIn) \n\
{\n\
    vec3 linearOut = pow(srgbIn.rgb, vec3(2.2));\n\
    return vec4(linearOut, srgbIn.a);\n\
}\n\
";
