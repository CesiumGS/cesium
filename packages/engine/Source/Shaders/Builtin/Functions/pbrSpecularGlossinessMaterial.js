//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Compute parameters for physically based rendering using the\n\
 * specular/glossy workflow. All inputs are linear; sRGB texture values must\n\
 * be decoded beforehand\n\
 *\n\
 * @name czm_pbrSpecularGlossinessMaterial\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} diffuse The diffuse color for dielectrics (non-metals)\n\
 * @param {vec3} specular The reflectance at normal incidence (f0)\n\
 * @param {float} glossiness A number from 0.0 to 1.0 indicating how smooth the surface is.\n\
 * @return {czm_pbrParameters} parameters to pass into {@link czm_pbrLighting}\n\
 */\n\
czm_pbrParameters czm_pbrSpecularGlossinessMaterial(\n\
    vec3 diffuse,\n\
    vec3 specular,\n\
    float glossiness\n\
) \n\
{\n\
    czm_pbrParameters results;\n\
\n\
    // glossiness is the opposite of roughness, but easier for artists to use.\n\
    float roughness = 1.0 - glossiness;\n\
    results.roughness = roughness * roughness;\n\
\n\
    results.diffuseColor = diffuse * (1.0 - max(max(specular.r, specular.g), specular.b));\n\
    results.f0 = specular;\n\
\n\
    return results;\n\
}\n\
";
