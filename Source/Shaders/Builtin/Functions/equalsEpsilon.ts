//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/**\n\
 * Compares <code>left</code> and <code>right</code> componentwise. Returns <code>true</code>\n\
 * if they are within <code>epsilon</code> and <code>false</code> otherwise. The inputs\n\
 * <code>left</code> and <code>right</code> can be <code>float</code>s, <code>vec2</code>s,\n\
 * <code>vec3</code>s, or <code>vec4</code>s.\n\
 *\n\
 * @name czm_equalsEpsilon\n\
 * @glslFunction\n\
 *\n\
 * @param {} left The first vector.\n\
 * @param {} right The second vector.\n\
 * @param {float} epsilon The epsilon to use for equality testing.\n\
 * @returns {bool} <code>true</code> if the components are within <code>epsilon</code> and <code>false</code> otherwise.\n\
 *\n\
 * @example\n\
 * // GLSL declarations\n\
 * bool czm_equalsEpsilon(float left, float right, float epsilon);\n\
 * bool czm_equalsEpsilon(vec2 left, vec2 right, float epsilon);\n\
 * bool czm_equalsEpsilon(vec3 left, vec3 right, float epsilon);\n\
 * bool czm_equalsEpsilon(vec4 left, vec4 right, float epsilon);\n\
 */\n\
bool czm_equalsEpsilon(vec4 left, vec4 right, float epsilon) {\n\
    return all(lessThanEqual(abs(left - right), vec4(epsilon)));\n\
}\n\
\n\
bool czm_equalsEpsilon(vec3 left, vec3 right, float epsilon) {\n\
    return all(lessThanEqual(abs(left - right), vec3(epsilon)));\n\
}\n\
\n\
bool czm_equalsEpsilon(vec2 left, vec2 right, float epsilon) {\n\
    return all(lessThanEqual(abs(left - right), vec2(epsilon)));\n\
}\n\
\n\
bool czm_equalsEpsilon(float left, float right, float epsilon) {\n\
    return (abs(left - right) <= epsilon);\n\
}\n\
";
});