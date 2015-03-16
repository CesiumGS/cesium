    //This file is automatically rebuilt by the Cesium build process.
    /*global define*/
    define(function() {
    "use strict";
    return "/**\n\
 * Returns 1.0 if the given value is positive or zero, and -1.0 if it is negative.  This is similar to the GLSL\n\
 * built-in function <code>sign</code> except that returns 1.0 instead of 0.0 when the input value is 0.0.\n\
 * \n\
 * @name czm_signNotZero\n\
 * @glslFunction\n\
 *\n\
 * @param {} value The value for which to determine the sign.\n\
 * @returns {} 1.0 if the value is positive or zero, -1.0 if the value is negative.\n\
 */\n\
float czm_signNotZero(float value)\n\
{\n\
    return value >= 0.0 ? 1.0 : -1.0;\n\
}\n\
\n\
vec2 czm_signNotZero(vec2 value)\n\
{\n\
    return vec2(czm_signNotZero(value.x), czm_signNotZero(value.y));\n\
}\n\
\n\
vec3 czm_signNotZero(vec3 value)\n\
{\n\
    return vec3(czm_signNotZero(value.x), czm_signNotZero(value.y), czm_signNotZero(value.z));\n\
}\n\
\n\
vec4 czm_signNotZero(vec4 value)\n\
{\n\
    return vec4(czm_signNotZero(value.x), czm_signNotZero(value.y), czm_signNotZero(value.z), czm_signNotZero(value.w));\n\
}";
});