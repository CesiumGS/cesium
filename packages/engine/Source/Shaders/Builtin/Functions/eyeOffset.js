//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * DOC_TBA\n\
 *\n\
 * @name czm_eyeOffset\n\
 * @glslFunction\n\
 *\n\
 * @param {vec4} positionEC DOC_TBA.\n\
 * @param {vec3} eyeOffset DOC_TBA.\n\
 *\n\
 * @returns {vec4} DOC_TBA.\n\
 */\n\
vec4 czm_eyeOffset(vec4 positionEC, vec3 eyeOffset)\n\
{\n\
    // This equation is approximate in x and y.\n\
    vec4 p = positionEC;\n\
    vec4 zEyeOffset = normalize(p) * eyeOffset.z;\n\
    p.xy += eyeOffset.xy + zEyeOffset.xy;\n\
    p.z += zEyeOffset.z;\n\
    return p;\n\
}\n\
";
