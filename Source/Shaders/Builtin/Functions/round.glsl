/**
 * Round a floating point value. This function exists because round() doesn't
 * exist in GLSL 1.00. 
 *
 * @param {float|vec2|vec3|vec4} value The value to round
 * @param {float|vec2|vec3|vec3} The rounded value. The type matches the input.
 */
float czm_round(float value) {
  return floor(value + 0.5);
}

vec2 czm_round(vec2 value) {
  return floor(value + 0.5);
}

vec3 czm_round(vec3 value) {
  return floor(value + 0.5);
}

vec4 czm_round(vec4 value) {
  return floor(value + 0.5);
}
