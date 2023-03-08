//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Get default parameters for physically based rendering. These defaults\n\
 * describe a rough dielectric (non-metal) surface (e.g. rough plastic).\n\
 *\n\
 * @return {czm_pbrParameters} Default parameters for {@link czm_pbrLighting}\n\
 */\n\
czm_pbrParameters czm_defaultPbrMaterial()\n\
{\n\
    czm_pbrParameters results;\n\
    results.diffuseColor = vec3(1.0);\n\
    results.roughness = 1.0;\n\
\n\
    const vec3 REFLECTANCE_DIELECTRIC = vec3(0.04);\n\
    results.f0 = REFLECTANCE_DIELECTRIC;\n\
    return results;\n\
}\n\
";
