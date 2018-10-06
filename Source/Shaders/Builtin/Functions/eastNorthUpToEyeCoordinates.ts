//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "mat3 czm_eastNorthUpToEyeCoordinates(vec3 positionMC, vec3 normalEC)\n\
{\n\
vec3 tangentMC = normalize(vec3(-positionMC.y, positionMC.x, 0.0));\n\
vec3 tangentEC = normalize(czm_normal3D * tangentMC);\n\
vec3 bitangentEC = normalize(cross(normalEC, tangentEC));\n\
return mat3(\n\
tangentEC.x,   tangentEC.y,   tangentEC.z,\n\
bitangentEC.x, bitangentEC.y, bitangentEC.z,\n\
normalEC.x,    normalEC.y,    normalEC.z);\n\
}\n\
";
});