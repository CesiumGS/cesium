    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * Creates a matrix that transforms vectors from tangent space to eye space.\n\
 *\n\
 * @name czm_tangentToEyeSpaceMatrix\n\
 * @glslFunction\n\
 * \n\
 * @param {vec3} normalEC The normal vector in eye coordinates.\n\
 * @param {vec3} tangentEC The tangent vector in eye coordinates.\n\
 * @param {vec3} binormalEC The binormal vector in eye coordinates.\n\
 *\n\
 * @returns {mat3} The matrix that transforms from tangent space to eye space.\n\
 *\n\
 * @example\n\
 * mat3 tangentToEye = czm_tangentToEyeSpaceMatrix(normalEC, tangentEC, binormalEC);\n\
 * vec3 normal = tangentToEye * texture2D(normalMap, st).xyz;\n\
 */\n\
mat3 czm_tangentToEyeSpaceMatrix(vec3 normalEC, vec3 tangentEC, vec3 binormalEC)\n\
{\n\
    vec3 normal = normalize(normalEC);\n\
    vec3 tangent = normalize(tangentEC);\n\
    vec3 binormal = normalize(binormalEC);\n\
    return mat3(tangent.x,  tangent.y,  tangent.z,\n\
                binormal.x, binormal.y, binormal.z,\n\
                normal.x,   normal.y,   normal.z);\n\
}\n\
";
});