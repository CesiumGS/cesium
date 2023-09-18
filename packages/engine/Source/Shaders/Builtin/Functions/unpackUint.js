//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Unpack unsigned integers of 1-4 bytes. in WebGL 1, there is no uint type,\n\
 * so the return value is an int.\n\
 * <p>\n\
 * There are also precision limitations in WebGL 1. highp int is still limited\n\
 * to 24 bits. Above the value of 2^24 = 16777216, precision loss may occur.\n\
 * </p>\n\
 *\n\
 * @param {float|vec2|vec3|vec4} packed The packed value. For vectors, the components are listed in little-endian order.\n\
 *\n\
 * @return {int} The unpacked value.\n\
 */\n\
 int czm_unpackUint(float packedValue) {\n\
   float rounded = czm_round(packedValue * 255.0);\n\
   return int(rounded);\n\
 }\n\
\n\
 int czm_unpackUint(vec2 packedValue) {\n\
   vec2 rounded = czm_round(packedValue * 255.0);\n\
   return int(dot(rounded, vec2(1.0, 256.0)));\n\
 }\n\
\n\
 int czm_unpackUint(vec3 packedValue) {\n\
   vec3 rounded = czm_round(packedValue * 255.0);\n\
   return int(dot(rounded, vec3(1.0, 256.0, 65536.0)));\n\
 }\n\
\n\
 int czm_unpackUint(vec4 packedValue) {\n\
   vec4 rounded = czm_round(packedValue * 255.0);\n\
   return int(dot(rounded, vec4(1.0, 256.0, 65536.0, 16777216.0)));\n\
 }\n\
";
