//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_getSpecular(vec3 lightDirectionEC, vec3 toEyeEC, vec3 normalEC, float shininess)\n\
{\n\
vec3 toReflectedLight = reflect(-lightDirectionEC, normalEC);\n\
float specular = max(dot(toReflectedLight, toEyeEC), 0.0);\n\
return pow(specular, max(shininess, czm_epsilon2));\n\
}\n\
";
});