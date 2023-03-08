//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Adjusts the hue of a color.\n\
 * \n\
 * @name czm_hue\n\
 * @glslFunction\n\
 * \n\
 * @param {vec3} rgb The color.\n\
 * @param {float} adjustment The amount to adjust the hue of the color in radians.\n\
 *\n\
 * @returns {float} The color with the hue adjusted.\n\
 *\n\
 * @example\n\
 * vec3 adjustHue = czm_hue(color, czm_pi); // The same as czm_hue(color, -czm_pi)\n\
 */\n\
vec3 czm_hue(vec3 rgb, float adjustment)\n\
{\n\
    const mat3 toYIQ = mat3(0.299,     0.587,     0.114,\n\
                            0.595716, -0.274453, -0.321263,\n\
                            0.211456, -0.522591,  0.311135);\n\
    const mat3 toRGB = mat3(1.0,  0.9563,  0.6210,\n\
                            1.0, -0.2721, -0.6474,\n\
                            1.0, -1.107,   1.7046);\n\
    \n\
    vec3 yiq = toYIQ * rgb;\n\
    float hue = atan(yiq.z, yiq.y) + adjustment;\n\
    float chroma = sqrt(yiq.z * yiq.z + yiq.y * yiq.y);\n\
    \n\
    vec3 color = vec3(yiq.x, chroma * cos(hue), chroma * sin(hue));\n\
    return toRGB * color;\n\
}\n\
";
