vec3 czm_inverseGamma(vec3 rgb) {
    return pow(rgb, vec3(1.0 / czm_gamma));
}
