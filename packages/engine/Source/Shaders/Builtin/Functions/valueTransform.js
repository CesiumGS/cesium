//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Transform metadata values following the EXT_structural_metadata spec\n\
 * by multiplying by scale and adding the offset. Operations are always\n\
 * performed component-wise, even for matrices.\n\
 * \n\
 * @param {float|vec2|vec3|vec4|mat2|mat3|mat4} offset The offset to add\n\
 * @param {float|vec2|vec3|vec4|mat2|mat3|mat4} scale The scale factor to multiply\n\
 * @param {float|vec2|vec3|vec4|mat2|mat3|mat4} value The original value.\n\
 *\n\
 * @return {float|vec2|vec3|vec4|mat2|mat3|mat4} The transformed value of the same scalar/vector/matrix type as the input.\n\
 */\n\
float czm_valueTransform(float offset, float scale, float value) {\n\
  return scale * value + offset;\n\
}\n\
\n\
vec2 czm_valueTransform(vec2 offset, vec2 scale, vec2 value) {\n\
  return scale * value + offset;\n\
}\n\
\n\
vec3 czm_valueTransform(vec3 offset, vec3 scale, vec3 value) {\n\
  return scale * value + offset;\n\
}\n\
\n\
vec4 czm_valueTransform(vec4 offset, vec4 scale, vec4 value) {\n\
  return scale * value + offset;\n\
}\n\
\n\
mat2 czm_valueTransform(mat2 offset, mat2 scale, mat2 value) {\n\
  return matrixCompMult(scale, value) + offset;\n\
}\n\
\n\
mat3 czm_valueTransform(mat3 offset, mat3 scale, mat3 value) {\n\
  return matrixCompMult(scale, value) + offset;\n\
}\n\
\n\
mat4 czm_valueTransform(mat4 offset, mat4 scale, mat4 value) {\n\
  return matrixCompMult(scale, value) + offset;\n\
}\n\
";
