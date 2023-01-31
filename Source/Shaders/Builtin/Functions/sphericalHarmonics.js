//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Computes a color from the third order spherical harmonic coefficients and a normalized direction vector.\n\
 * <p>\n\
 * The order of the coefficients is [L00, L1_1, L10, L11, L2_2, L2_1, L20, L21, L22].\n\
 * </p>\n\
 *\n\
 * @name czm_sphericalHarmonics\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} normal The normalized direction.\n\
 * @param {vec3[9]} coefficients The third order spherical harmonic coefficients.\n\
 * @returns {vec3} The color at the direction.\n\
 *\n\
 * @see https://graphics.stanford.edu/papers/envmap/envmap.pdf\n\
 */\n\
vec3 czm_sphericalHarmonics(vec3 normal, vec3 coefficients[9])\n\
{\n\
    const float c1 = 0.429043;\n\
    const float c2 = 0.511664;\n\
    const float c3 = 0.743125;\n\
    const float c4 = 0.886227;\n\
    const float c5 = 0.247708;\n\
\n\
    vec3 L00 = coefficients[0];\n\
    vec3 L1_1 = coefficients[1];\n\
    vec3 L10 = coefficients[2];\n\
    vec3 L11 = coefficients[3];\n\
    vec3 L2_2 = coefficients[4];\n\
    vec3 L2_1 = coefficients[5];\n\
    vec3 L20 = coefficients[6];\n\
    vec3 L21 = coefficients[7];\n\
    vec3 L22 = coefficients[8];\n\
\n\
    float x = normal.x;\n\
    float y = normal.y;\n\
    float z = normal.z;\n\
\n\
    return c1 * L22 * (x * x - y * y) + c3 * L20 * z * z + c4 * L00 - c5 * L20 +\n\
           2.0 * c1 * (L2_2 * x * y + L21 * x * z + L2_1 * y * z) +\n\
           2.0 * c2 * (L11 * x + L1_1 * y + L10 * z);\n\
}\n\
";
