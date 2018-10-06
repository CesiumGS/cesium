//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_branchFreeTernary(bool comparison, float a, float b) {\n\
float useA = float(comparison);\n\
return a * useA + b * (1.0 - useA);\n\
}\n\
vec2 czm_branchFreeTernary(bool comparison, vec2 a, vec2 b) {\n\
float useA = float(comparison);\n\
return a * useA + b * (1.0 - useA);\n\
}\n\
vec3 czm_branchFreeTernary(bool comparison, vec3 a, vec3 b) {\n\
float useA = float(comparison);\n\
return a * useA + b * (1.0 - useA);\n\
}\n\
vec4 czm_branchFreeTernary(bool comparison, vec4 a, vec4 b) {\n\
float useA = float(comparison);\n\
return a * useA + b * (1.0 - useA);\n\
}\n\
";
});