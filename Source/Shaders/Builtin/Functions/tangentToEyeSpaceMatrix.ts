//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "mat3 czm_tangentToEyeSpaceMatrix(vec3 normalEC, vec3 tangentEC, vec3 bitangentEC)\n\
{\n\
vec3 normal = normalize(normalEC);\n\
vec3 tangent = normalize(tangentEC);\n\
vec3 bitangent = normalize(bitangentEC);\n\
return mat3(tangent.x  , tangent.y  , tangent.z,\n\
bitangent.x, bitangent.y, bitangent.z,\n\
normal.x   , normal.y   , normal.z);\n\
}\n\
";
});