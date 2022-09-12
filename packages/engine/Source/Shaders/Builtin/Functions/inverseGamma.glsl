/**
 * Converts a color in linear space to RGB space.
 *
 * @name czm_inverseGamma
 * @glslFunction
 *
 * @param {vec3} color The color in linear space.
 * @returns {vec3} The color in RGB space.
 */
vec3 czm_inverseGamma(vec3 color) {
    return pow(color, vec3(1.0 / czm_gamma));
}
