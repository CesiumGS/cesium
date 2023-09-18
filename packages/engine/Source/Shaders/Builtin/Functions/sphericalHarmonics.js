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
    return\n\
          L00\n\
        + L1_1 * y\n\
        + L10 * z\n\
        + L11 * x\n\
        + L2_2 * (y * x)\n\
        + L2_1 * (y * z)\n\
        + L20 * (3.0 * z * z - 1.0)\n\
        + L21 * (z * x)\n\
        + L22 * (x * x - y * y);\n\
}\n\
";
