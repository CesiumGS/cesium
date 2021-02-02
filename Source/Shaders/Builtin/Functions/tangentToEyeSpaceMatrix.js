//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Creates a matrix that transforms vectors from tangent space to eye space.\n\
 *\n\
 * @name czm_tangentToEyeSpaceMatrix\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} normalEC The normal vector in eye coordinates.\n\
 * @param {vec3} tangentEC The tangent vector in eye coordinates.\n\
 * @param {vec3} bitangentEC The bitangent vector in eye coordinates.\n\
 *\n\
 * @returns {mat3} The matrix that transforms from tangent space to eye space.\n\
 *\n\
 * @example\n\
 * mat3 tangentToEye = czm_tangentToEyeSpaceMatrix(normalEC, tangentEC, bitangentEC);\n\
 * vec3 normal = tangentToEye * texture2D(normalMap, st).xyz;\n\
 */\n\
mat3 czm_tangentToEyeSpaceMatrix(vec3 normalEC, vec3 tangentEC, vec3 bitangentEC)\n\
{\n\
    vec3 normal = normalize(normalEC);\n\
    vec3 tangent = normalize(tangentEC);\n\
    vec3 bitangent = normalize(bitangentEC);\n\
    return mat3(tangent.x  , tangent.y  , tangent.z,\n\
                bitangent.x, bitangent.y, bitangent.z,\n\
                normal.x   , normal.y   , normal.z);\n\
}\n\
";
