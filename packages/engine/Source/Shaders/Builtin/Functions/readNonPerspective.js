//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Reads a value previously transformed with {@link czm_writeNonPerspective}\n\
 * by dividing it by `w`, the value used in the perspective divide.\n\
 * This function is intended to be called in a fragment shader to access a\n\
 * `varying` that should not be subject to perspective interpolation.\n\
 * For example, screen-space texture coordinates. The value should have been\n\
 * previously written in the vertex shader with a call to\n\
 * {@link czm_writeNonPerspective}.\n\
 *\n\
 * @name czm_readNonPerspective\n\
 * @glslFunction\n\
 *\n\
 * @param {float|vec2|vec3|vec4} value The non-perspective value to be read.\n\
 * @param {float} oneOverW One over the perspective divide value, `w`. Usually this is simply `gl_FragCoord.w`.\n\
 * @returns {float|vec2|vec3|vec4} The usable value.\n\
 */\n\
float czm_readNonPerspective(float value, float oneOverW) {\n\
    return value * oneOverW;\n\
}\n\
\n\
vec2 czm_readNonPerspective(vec2 value, float oneOverW) {\n\
    return value * oneOverW;\n\
}\n\
\n\
vec3 czm_readNonPerspective(vec3 value, float oneOverW) {\n\
    return value * oneOverW;\n\
}\n\
\n\
vec4 czm_readNonPerspective(vec4 value, float oneOverW) {\n\
    return value * oneOverW;\n\
}\n\
";
