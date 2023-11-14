/**
 * Compares <code>left</code> and <code>right</code> componentwise. Returns <code>true</code>
 * if they are within <code>epsilon</code> and <code>false</code> otherwise. The inputs
 * <code>left</code> and <code>right</code> can be <code>float</code>s, <code>vec2</code>s,
 * <code>vec3</code>s, or <code>vec4</code>s.
 *
 * @name czm_equalsEpsilon
 * @glslFunction
 *
 * @param {} left The first vector.
 * @param {} right The second vector.
 * @param {float} epsilon The epsilon to use for equality testing.
 * @returns {bool} <code>true</code> if the components are within <code>epsilon</code> and <code>false</code> otherwise.
 *
 * @example
 * // GLSL declarations
 * bool czm_equalsEpsilon(float left, float right, float epsilon);
 * bool czm_equalsEpsilon(vec2 left, vec2 right, float epsilon);
 * bool czm_equalsEpsilon(vec3 left, vec3 right, float epsilon);
 * bool czm_equalsEpsilon(vec4 left, vec4 right, float epsilon);
 */
bool czm_equalsEpsilon(vec4 left, vec4 right, float epsilon) {
    return all(lessThanEqual(abs(left - right), vec4(epsilon)));
}

bool czm_equalsEpsilon(vec3 left, vec3 right, float epsilon) {
    return all(lessThanEqual(abs(left - right), vec3(epsilon)));
}

bool czm_equalsEpsilon(vec2 left, vec2 right, float epsilon) {
    return all(lessThanEqual(abs(left - right), vec2(epsilon)));
}

bool czm_equalsEpsilon(float left, float right, float epsilon) {
    return (abs(left - right) <= epsilon);
}
