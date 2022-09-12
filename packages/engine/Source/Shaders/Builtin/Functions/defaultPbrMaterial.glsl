/**
 * Get default parameters for physically based rendering. These defaults
 * describe a rough dielectric (non-metal) surface (e.g. rough plastic).
 *
 * @return {czm_pbrParameters} Default parameters for {@link czm_pbrLighting}
 */
czm_pbrParameters czm_defaultPbrMaterial()
{
    czm_pbrParameters results;
    results.diffuseColor = vec3(1.0);
    results.roughness = 1.0;

    const vec3 REFLECTANCE_DIELECTRIC = vec3(0.04);
    results.f0 = REFLECTANCE_DIELECTRIC;
    return results;
}
