/**
 * Compute parameters for physically based rendering using the
 * metallic/roughness workflow. All inputs are linear; sRGB texture values must
 * be decoded beforehand
 *
 * @name czm_pbrMetallicRoughnessMaterial
 * @glslFunction
 *
 * @param {vec3} baseColor For dielectrics, this is the base color. For metals, this is the f0 value (reflectance at normal incidence)
 * @param {float} metallic 0.0 indicates dielectric. 1.0 indicates metal. Values in between are allowed (e.g. to model rust or dirt);
 * @param {float} roughness A value between 0.0 and 1.0
 * @return {czm_pbrParameters} parameters to pass into {@link czm_pbrLighting}
 */
czm_pbrParameters czm_pbrMetallicRoughnessMaterial(
    vec3 baseColor,
    float metallic,
    float roughness
) {
    czm_pbrParameters results;

    // roughness is authored as perceptual roughness
    // square it to get material roughness
    roughness = clamp(roughness, 0.0, 1.0);
    results.roughness = roughness * roughness;

    // dielectrics us f0 = 0.04, metals use albedo as f0
    metallic = clamp(metallic, 0.0, 1.0);
    const vec3 REFLECTANCE_DIELECTRIC = vec3(0.04);
    vec3 f0 = mix(REFLECTANCE_DIELECTRIC, baseColor, metallic);
    results.f0 = f0;

    // diffuse only applies to dielectrics.
    results.diffuseColor = baseColor * (1.0 - f0) * (1.0 - metallic);

    return results;
}
