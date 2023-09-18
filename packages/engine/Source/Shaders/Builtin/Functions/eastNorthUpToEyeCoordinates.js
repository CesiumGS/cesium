//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Computes a 3x3 rotation matrix that transforms vectors from an ellipsoid's east-north-up coordinate system \n\
 * to eye coordinates.  In east-north-up coordinates, x points east, y points north, and z points along the \n\
 * surface normal.  East-north-up can be used as an ellipsoid's tangent space for operations such as bump mapping.\n\
 * <br /><br />\n\
 * The ellipsoid is assumed to be centered at the model coordinate's origin.\n\
 *\n\
 * @name czm_eastNorthUpToEyeCoordinates\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} positionMC The position on the ellipsoid in model coordinates.\n\
 * @param {vec3} normalEC The normalized ellipsoid surface normal, at <code>positionMC</code>, in eye coordinates.\n\
 *\n\
 * @returns {mat3} A 3x3 rotation matrix that transforms vectors from the east-north-up coordinate system to eye coordinates.\n\
 *\n\
 * @example\n\
 * // Transform a vector defined in the east-north-up coordinate \n\
 * // system, (0, 0, 1) which is the surface normal, to eye \n\
 * // coordinates.\n\
 * mat3 m = czm_eastNorthUpToEyeCoordinates(positionMC, normalEC);\n\
 * vec3 normalEC = m * vec3(0.0, 0.0, 1.0);\n\
 */\n\
mat3 czm_eastNorthUpToEyeCoordinates(vec3 positionMC, vec3 normalEC)\n\
{\n\
    vec3 tangentMC = normalize(vec3(-positionMC.y, positionMC.x, 0.0));  // normalized surface tangent in model coordinates\n\
    vec3 tangentEC = normalize(czm_normal3D * tangentMC);                // normalized surface tangent in eye coordinates\n\
    vec3 bitangentEC = normalize(cross(normalEC, tangentEC));            // normalized surface bitangent in eye coordinates\n\
\n\
    return mat3(\n\
        tangentEC.x,   tangentEC.y,   tangentEC.z,\n\
        bitangentEC.x, bitangentEC.y, bitangentEC.z,\n\
        normalEC.x,    normalEC.y,    normalEC.z);\n\
}\n\
";
