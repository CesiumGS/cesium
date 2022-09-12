/**
 * Transforms a plane.
 * 
 * @name czm_transformPlane
 * @glslFunction
 *
 * @param {vec4} plane The plane in Hessian Normal Form.
 * @param {mat4} transform The inverse-transpose of a transformation matrix.
 */
vec4 czm_transformPlane(vec4 plane, mat4 transform) {
    vec4 transformedPlane = transform * plane;
    // Convert the transformed plane to Hessian Normal Form
    float normalMagnitude = length(transformedPlane.xyz);
    return transformedPlane / normalMagnitude;
}
