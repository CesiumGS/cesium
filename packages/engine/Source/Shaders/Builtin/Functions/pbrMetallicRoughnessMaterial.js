//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * Compute parameters for physically based rendering using the\n\
 * metallic/roughness workflow. All inputs are linear; sRGB texture values must\n\
 * be decoded beforehand\n\
 *\n\
 * @name czm_pbrMetallicRoughnessMaterial\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} baseColor For dielectrics, this is the base color. For metals, this is the f0 value (reflectance at normal incidence)\n\
 * @param {float} metallic 0.0 indicates dielectric. 1.0 indicates metal. Values in between are allowed (e.g. to model rust or dirt);\n\
 * @param {float} roughness A value between 0.0 and 1.0\n\
 * @return {czm_pbrParameters} parameters to pass into {@link czm_pbrLighting}\n\
 */\n\
czm_pbrParameters czm_pbrMetallicRoughnessMaterial(\n\
    vec3 baseColor,\n\
    float metallic,\n\
    float roughness\n\
) \n\
{\n\
    czm_pbrParameters results;\n\
\n\
    // roughness is authored as perceptual roughness\n\
    // square it to get material roughness\n\
    roughness = clamp(roughness, 0.0, 1.0);\n\
    results.roughness = roughness * roughness;\n\
\n\
    // dielectrics use f0 = 0.04, metals use albedo as f0\n\
    metallic = clamp(metallic, 0.0, 1.0);\n\
    const vec3 REFLECTANCE_DIELECTRIC = vec3(0.04);\n\
    vec3 f0 = mix(REFLECTANCE_DIELECTRIC, baseColor, metallic);\n\
    results.f0 = f0;\n\
\n\
    // diffuse only applies to dielectrics.\n\
    results.diffuseColor = baseColor * (1.0 - f0) * (1.0 - metallic);\n\
\n\
    return results;\n\
}\n\
";
