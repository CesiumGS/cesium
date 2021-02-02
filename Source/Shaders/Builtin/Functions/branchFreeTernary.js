//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Branchless ternary operator to be used when it's inexpensive to explicitly\n\
 * evaluate both possibilities for a float expression.\n\
 *\n\
 * @name czm_branchFreeTernary\n\
 * @glslFunction\n\
 *\n\
 * @param {bool} comparison A comparison statement\n\
 * @param {float} a Value to return if the comparison is true.\n\
 * @param {float} b Value to return if the comparison is false.\n\
 *\n\
 * @returns {float} equivalent of comparison ? a : b\n\
 */\n\
float czm_branchFreeTernary(bool comparison, float a, float b) {\n\
    float useA = float(comparison);\n\
    return a * useA + b * (1.0 - useA);\n\
}\n\
\n\
/**\n\
 * Branchless ternary operator to be used when it's inexpensive to explicitly\n\
 * evaluate both possibilities for a vec2 expression.\n\
 *\n\
 * @name czm_branchFreeTernary\n\
 * @glslFunction\n\
 *\n\
 * @param {bool} comparison A comparison statement\n\
 * @param {vec2} a Value to return if the comparison is true.\n\
 * @param {vec2} b Value to return if the comparison is false.\n\
 *\n\
 * @returns {vec2} equivalent of comparison ? a : b\n\
 */\n\
vec2 czm_branchFreeTernary(bool comparison, vec2 a, vec2 b) {\n\
    float useA = float(comparison);\n\
    return a * useA + b * (1.0 - useA);\n\
}\n\
\n\
/**\n\
 * Branchless ternary operator to be used when it's inexpensive to explicitly\n\
 * evaluate both possibilities for a vec3 expression.\n\
 *\n\
 * @name czm_branchFreeTernary\n\
 * @glslFunction\n\
 *\n\
 * @param {bool} comparison A comparison statement\n\
 * @param {vec3} a Value to return if the comparison is true.\n\
 * @param {vec3} b Value to return if the comparison is false.\n\
 *\n\
 * @returns {vec3} equivalent of comparison ? a : b\n\
 */\n\
vec3 czm_branchFreeTernary(bool comparison, vec3 a, vec3 b) {\n\
    float useA = float(comparison);\n\
    return a * useA + b * (1.0 - useA);\n\
}\n\
\n\
/**\n\
 * Branchless ternary operator to be used when it's inexpensive to explicitly\n\
 * evaluate both possibilities for a vec4 expression.\n\
 *\n\
 * @name czm_branchFreeTernary\n\
 * @glslFunction\n\
 *\n\
 * @param {bool} comparison A comparison statement\n\
 * @param {vec3} a Value to return if the comparison is true.\n\
 * @param {vec3} b Value to return if the comparison is false.\n\
 *\n\
 * @returns {vec3} equivalent of comparison ? a : b\n\
 */\n\
vec4 czm_branchFreeTernary(bool comparison, vec4 a, vec4 b) {\n\
    float useA = float(comparison);\n\
    return a * useA + b * (1.0 - useA);\n\
}\n\
";
