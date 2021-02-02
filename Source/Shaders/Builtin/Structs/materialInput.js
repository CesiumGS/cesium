//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Used as input to every material's czm_getMaterial function.\n\
 *\n\
 * @name czm_materialInput\n\
 * @glslStruct\n\
 *\n\
 * @property {float} s 1D texture coordinates.\n\
 * @property {vec2} st 2D texture coordinates.\n\
 * @property {vec3} str 3D texture coordinates.\n\
 * @property {vec3} normalEC Unperturbed surface normal in eye coordinates.\n\
 * @property {mat3} tangentToEyeMatrix Matrix for converting a tangent space normal to eye space.\n\
 * @property {vec3} positionToEyeEC Vector from the fragment to the eye in eye coordinates.  The magnitude is the distance in meters from the fragment to the eye.\n\
 * @property {float} height The height of the terrain in meters above or below the WGS84 ellipsoid.  Only available for globe materials.\n\
 * @property {float} slope The slope of the terrain in radians.  0 is flat; pi/2 is vertical.  Only available for globe materials.\n\
 * @property {float} aspect The aspect of the terrain in radians.  0 is East, pi/2 is North, pi is West, 3pi/2 is South.  Only available for globe materials.\n\
 */\n\
struct czm_materialInput\n\
{\n\
    float s;\n\
    vec2 st;\n\
    vec3 str;\n\
    vec3 normalEC;\n\
    mat3 tangentToEyeMatrix;\n\
    vec3 positionToEyeEC;\n\
    float height;\n\
    float slope;\n\
    float aspect;\n\
};\n\
";
