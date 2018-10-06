//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "float czm_signNotZero(float value)\n\
{\n\
return value >= 0.0 ? 1.0 : -1.0;\n\
}\n\
vec2 czm_signNotZero(vec2 value)\n\
{\n\
return vec2(czm_signNotZero(value.x), czm_signNotZero(value.y));\n\
}\n\
vec3 czm_signNotZero(vec3 value)\n\
{\n\
return vec3(czm_signNotZero(value.x), czm_signNotZero(value.y), czm_signNotZero(value.z));\n\
}\n\
vec4 czm_signNotZero(vec4 value)\n\
{\n\
return vec4(czm_signNotZero(value.x), czm_signNotZero(value.y), czm_signNotZero(value.z), czm_signNotZero(value.w));\n\
}\n\
";
});