/**
 * Compute parameters for physically based rendering using the
 * specular/glossy workflow. All inputs are linear; sRGB texture values must
 * be decoded beforehand
 *
 * @name czm_pbrSpecularGlossinessMaterial
 * @glslFunction
 *
 * @param {vec3} diffuse The diffuse color for dielectrics (non-metals)
 * @param {vec3} specular The reflectance at normal incidence (f0)
 * @param {float} glossiness A number from 0.0 to 1.0 indicating how smooth the surface is.
 * @return {czm_pbrParameters} parameters to pass into {@link czm_pbrLighting}
 */
czm_pbrParameters czm_pbrSpecularGlossinessMaterial(
    vec3 diffuse,
    vec3 specular,
    float glossiness
) {
    czm_pbrParameters results;

    // glossiness is the opposite of roughness, but easier for artists to use.
    float roughness = 1.0 - glossiness;
    results.roughness = roughness * roughness;

    results.diffuseColor = diffuse * (1.0 - max(max(specular.r, specular.g), specular.b));
    results.f0 = specular;

    return results;
}
