vec3 czm_gammaCorrect(vec3 rgb) {
    return pow(rgb, vec3(czm_gamma));
}
