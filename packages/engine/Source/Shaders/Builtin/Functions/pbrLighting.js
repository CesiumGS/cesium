//This file is automatically rebuilt by the Cesium build process.
export default "vec3 lambertianDiffuse(vec3 diffuseColor)\n\
{\n\
    return diffuseColor / czm_pi;\n\
}\n\
\n\
vec3 fresnelSchlick2(vec3 f0, vec3 f90, float VdotH)\n\
{\n\
    return f0 + (f90 - f0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);\n\
}\n\
\n\
float smithVisibilityG1(float NdotV, float roughness)\n\
{\n\
    // this is the k value for direct lighting.\n\
    // for image based lighting it will be roughness^2 / 2\n\
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;\n\
    return NdotV / (NdotV * (1.0 - k) + k);\n\
}\n\
\n\
float smithVisibilityGGX(float roughness, float NdotL, float NdotV)\n\
{\n\
    return (\n\
        smithVisibilityG1(NdotL, roughness) *\n\
        smithVisibilityG1(NdotV, roughness)\n\
    );\n\
}\n\
\n\
float GGX(float roughness, float NdotH)\n\
{\n\
    float roughnessSquared = roughness * roughness;\n\
    float f = (NdotH * roughnessSquared - NdotH) * NdotH + 1.0;\n\
    return roughnessSquared / (czm_pi * f * f);\n\
}\n\
\n\
/**\n\
 * Compute the diffuse and specular contributions using physically based\n\
 * rendering. This function only handles direct lighting.\n\
 * <p>\n\
 * This function only handles the lighting calculations. Metallic/roughness\n\
 * and specular/glossy must be handled separately. See {@czm_pbrMetallicRoughnessMaterial}, {@czm_pbrSpecularGlossinessMaterial} and {@czm_defaultPbrMaterial}\n\
 * </p>\n\
 *\n\
 * @name czm_pbrlighting\n\
 * @glslFunction\n\
 *\n\
 * @param {vec3} positionEC The position of the fragment in eye coordinates\n\
 * @param {vec3} normalEC The surface normal in eye coordinates\n\
 * @param {vec3} lightDirectionEC Unit vector pointing to the light source in eye coordinates.\n\
 * @param {vec3} lightColorHdr radiance of the light source. This is a HDR value.\n\
 * @param {czm_pbrParameters} The computed PBR parameters.\n\
 * @return {vec3} The computed HDR color\n\
 *\n\
 * @example\n\
 * czm_pbrParameters pbrParameters = czm_pbrMetallicRoughnessMaterial(\n\
 *  baseColor,\n\
 *  metallic,\n\
 *  roughness\n\
 * );\n\
 * vec3 color = czm_pbrlighting(\n\
 *  positionEC,\n\
 *  normalEC,\n\
 *  lightDirectionEC,\n\
 *  lightColorHdr,\n\
 *  pbrParameters);\n\
 */\n\
vec3 czm_pbrLighting(\n\
    vec3 positionEC,\n\
    vec3 normalEC,\n\
    vec3 lightDirectionEC,\n\
    vec3 lightColorHdr,\n\
    czm_pbrParameters pbrParameters\n\
)\n\
{\n\
    vec3 v = -normalize(positionEC);\n\
    vec3 l = normalize(lightDirectionEC);\n\
    vec3 h = normalize(v + l);\n\
    vec3 n = normalEC;\n\
    float NdotL = clamp(dot(n, l), 0.001, 1.0);\n\
    float NdotV = abs(dot(n, v)) + 0.001;\n\
    float NdotH = clamp(dot(n, h), 0.0, 1.0);\n\
    float LdotH = clamp(dot(l, h), 0.0, 1.0);\n\
    float VdotH = clamp(dot(v, h), 0.0, 1.0);\n\
\n\
    vec3 f0 = pbrParameters.f0;\n\
    float reflectance = max(max(f0.r, f0.g), f0.b);\n\
    vec3 f90 = vec3(clamp(reflectance * 25.0, 0.0, 1.0));\n\
    vec3 F = fresnelSchlick2(f0, f90, VdotH);\n\
\n\
    float alpha = pbrParameters.roughness;\n\
    float G = smithVisibilityGGX(alpha, NdotL, NdotV);\n\
    float D = GGX(alpha, NdotH);\n\
    vec3 specularContribution = F * G * D / (4.0 * NdotL * NdotV);\n\
\n\
    vec3 diffuseColor = pbrParameters.diffuseColor;\n\
    // F here represents the specular contribution\n\
    vec3 diffuseContribution = (1.0 - F) * lambertianDiffuse(diffuseColor);\n\
\n\
    // Lo = (diffuse + specular) * Li * NdotL\n\
    return (diffuseContribution + specularContribution) * NdotL * lightColorHdr;\n\
}\n\
";
