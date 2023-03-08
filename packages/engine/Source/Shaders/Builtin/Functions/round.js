//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Round a floating point value. This function exists because round() doesn't\n\
 * exist in GLSL 1.00. \n\
 *\n\
 * @param {float|vec2|vec3|vec4} value The value to round\n\
 * @param {float|vec2|vec3|vec3} The rounded value. The type matches the input.\n\
 */\n\
float czm_round(float value) {\n\
  return floor(value + 0.5);\n\
}\n\
\n\
vec2 czm_round(vec2 value) {\n\
  return floor(value + 0.5);\n\
}\n\
\n\
vec3 czm_round(vec3 value) {\n\
  return floor(value + 0.5);\n\
}\n\
\n\
vec4 czm_round(vec4 value) {\n\
  return floor(value + 0.5);\n\
}\n\
";
