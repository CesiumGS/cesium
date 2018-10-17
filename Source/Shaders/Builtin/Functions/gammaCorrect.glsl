/**
 * Converts a color from RGB space to linear space.
 *
 * @name czm_gammaCorrect
 * @glslFunction
 *
 * @param {vec3} color The color in RGB space.
 * @returns {vec3} The color in linear space.
 */
vec3 czm_gammaCorrect(vec3 color) {
#ifdef HDR
    color = pow(color, vec3(czm_gamma));
#endif
    return color;
}

float czm_gammaCorrectAlpha(float alpha) {
#ifdef HDR
    alpha = pow(alpha, 1.0 / czm_gamma);
#endif
    return alpha;
}

vec4 czm_gammaCorrect(vec4 color) {
#ifdef HDR
    color.rgb = pow(color.rgb, vec3(czm_gamma));
    color.a = czm_gammaCorrectAlpha(color.a);
#endif
    return color;
}
