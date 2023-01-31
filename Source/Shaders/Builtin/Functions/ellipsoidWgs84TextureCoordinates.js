//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * DOC_TBA\n\
 *\n\
 * @name czm_ellipsoidWgs84TextureCoordinates\n\
 * @glslFunction\n\
 */\n\
vec2 czm_ellipsoidWgs84TextureCoordinates(vec3 normal)\n\
{\n\
    return vec2(atan(normal.y, normal.x) * czm_oneOverTwoPi + 0.5, asin(normal.z) * czm_oneOverPi + 0.5);\n\
}\n\
";
