//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Transforms a plane.\n\
 * \n\
 * @name czm_transformPlane\n\
 * @glslFunction\n\
 *\n\
 * @param {vec4} plane The plane in Hessian Normal Form.\n\
 * @param {mat4} transform The inverse-transpose of a transformation matrix.\n\
 */\n\
vec4 czm_transformPlane(vec4 plane, mat4 transform) {\n\
    vec4 transformedPlane = transform * plane;\n\
    // Convert the transformed plane to Hessian Normal Form\n\
    float normalMagnitude = length(transformedPlane.xyz);\n\
    return transformedPlane / normalMagnitude;\n\
}\n\
";
