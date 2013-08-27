/**
 * Creates a matrix that transforms vectors from tangent space to eye space.
 *
 * @name czm_tangentToEyeSpaceMatrix
 * @glslFunction
 * 
 * @param {vec3} normalEC The normal vector in eye coordinates.
 * @param {vec3} tangentEC The tangent vector in eye coordinates.
 * @param {vec3} binormalEC The binormal vector in eye coordinates.
 *
 * @returns {mat3} The matrix that transforms from tangent space to eye space.
 *
 * @example
 * mat3 tangentToEye = czm_tangentToEyeSpaceMatrix(normalEC, tangentEC, binormalEC);
 * vec3 normal = tangentToEye * texture2D(normalMap, st).xyz;
 */
mat3 czm_tangentToEyeSpaceMatrix(vec3 normalEC, vec3 tangentEC, vec3 binormalEC)
{
    vec3 normal = normalize(normalEC);
    vec3 tangent = normalize(tangentEC);
    vec3 binormal = normalize(binormalEC);
    return mat3(tangent.x,  tangent.y,  tangent.z,
                binormal.x, binormal.y, binormal.z,
                normal.x,   normal.y,   normal.z);
}
