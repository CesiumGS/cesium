//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Transforms a value for non-perspective interpolation by multiplying\n\
 * it by w, the value used in the perspective divide. This function is\n\
 * intended to be called in a vertex shader to compute the value of a\n\
 * `varying` that should not be subject to perspective interpolation.\n\
 * For example, screen-space texture coordinates. The fragment shader\n\
 * must call {@link czm_readNonPerspective} to retrieve the final\n\
 * non-perspective value.\n\
 *\n\
 * @name czm_writeNonPerspective\n\
 * @glslFunction\n\
 *\n\
 * @param {float|vec2|vec3|vec4} value The value to be interpolated without accounting for perspective.\n\
 * @param {float} w The perspective divide value. Usually this is the computed `gl_Position.w`.\n\
 * @returns {float|vec2|vec3|vec4} The transformed value, intended to be stored in a `varying` and read in the\n\
 *          fragment shader with {@link czm_readNonPerspective}.\n\
 */\n\
float czm_writeNonPerspective(float value, float w) {\n\
    return value * w;\n\
}\n\
\n\
vec2 czm_writeNonPerspective(vec2 value, float w) {\n\
    return value * w;\n\
}\n\
\n\
vec3 czm_writeNonPerspective(vec3 value, float w) {\n\
    return value * w;\n\
}\n\
\n\
vec4 czm_writeNonPerspective(vec4 value, float w) {\n\
    return value * w;\n\
}\n\
";
