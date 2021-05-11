const float M_PI = 3.141592653589793;

vec3 lambertianDiffuse(vec3 diffuseColor) {
  return diffuseColor / M_PI;
}

vec3 fresnelSchlick2(vec3 f0, vec3 f90, float VdotH) {
    return f0 + (f90 - f0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);
}

float smithVisibilityG1(float NdotV, float roughness) {
    // this is the k value for direct lighting.
    // for image based lighting it will be roughness^2 / 2
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
}

float smithVisibilityGGX(float roughness, float NdotL, float NdotV) {
    return (
      smithVisibilityG1(NdotL, roughness) *
      smithVisibilityG1(NdotV, roughness)
    );
}

float GGX(float roughness, float NdotH) {
    float roughnessSquared = roughness * roughness;
    float f = (NdotH * roughnessSquared - NdotH) * NdotH + 1.0;
    return roughnessSquared / (M_PI * f * f);
}

#line 1000

struct PbrParameters {
  // diffuse color of the material
  vec3 diffuseColor;
  // roughness of the material.
  float roughness;
  // reflection at normal incidence
  vec3 f0;
};

const vec3 REFLECTANCE_DIELECTRIC = vec3(0.04);
PbrParameters czm_defaultPbrMaterial() {
  PbrParameters results;
  results.diffuseColor = vec3(1.0);
  results.roughness = 1.0;
  results.f0 = REFLECTANCE_DIELECTRIC;
  return results;
}

PbrParameters czm_pbrMetallicRoughnessMaterial(vec3 baseColor, float metallic, float roughness) {
  PbrParameters results;

  // roughness is authored as perceptual roughness
  // square it to get material roughness
  roughness = clamp(roughness, 0.0, 1.0);
  results.roughness = roughness * roughness;

  // dielectrics us f0 = 0.04, metals use albedo as f0
  metallic = clamp(metallic, 0.0, 1.0);
  vec3 f0 = mix(REFLECTANCE_DIELECTRIC, baseColor, metallic);
  results.f0 = f0;

  // diffuse only applies to dielectrics.
  results.diffuseColor = baseColor * (1.0 - f0) * (1.0 - metallic);

  return results;
}

PbrParameters czm_pbrSpecularGlossinessMaterial(vec3 diffuse, vec3 specular, float glossiness) {
  PbrParameters results;

  // glossiness is the opposite of roughness, but easier for artists to use.
  float roughness = 1.0 - glossiness;
  results.roughness = roughness * roughness;

  results.diffuseColor = diffuse * (1.0 - max(max(specular.r, specular.g), specular.b));
  results.f0 = specular;

  return results;
}


/**
 * Compute an HDR color according to the physically-based-rendering Metallic Roughness model.
 *
 * @name czm_pbrMetallicRoughness
 * @glslFunction
 *
 * TODO: update this list
 * @param {vec3} normalEC The surface normal in eye coordinates.
 * @param {vec3} lightDirectionEC Unit vector pointing to the light source in eye coordinates.
 * @param {vec3} toEyeEC Unit vector pointing to the eye position in eye coordinates.
 * @param {float} shininess The sharpness of the specular reflection.  Higher values create a smaller, more focused specular highlight.
 *
 * @returns {vec4} The computed PBR color
 *
 * @see czm_phong
 *
 * @example
 * float diffuseIntensity = czm_getLambertDiffuse(lightDirectionEC, normalEC);
 * float specularIntensity = czm_getSpecular(lightDirectionEC, toEyeEC, normalEC, 200);
 * vec3 color = (diffuseColor * diffuseIntensity) + (specularColor * specularIntensity);
 */
vec3 czm_pbrLighting(
    vec3 positionEC, // p
    vec3 normalEC, // n
    vec3 lightDirectionEC, // l
    vec3 lightColorHdr, // L (radiance)... is this already attenuated?
    PbrParameters pbrParameters
) {
  vec3 v = -normalize(positionEC);
  vec3 l = normalize(lightDirectionEC);
  vec3 h = normalize(v + l);
  vec3 n = normalEC;
  float NdotL = clamp(dot(n, l), 0.001, 1.0);
  float NdotV = abs(dot(n, v)) + 0.001;
  float NdotH = clamp(dot(n, h), 0.0, 1.0);
  float LdotH = clamp(dot(l, h), 0.0, 1.0);
  float VdotH = clamp(dot(v, h), 0.0, 1.0);

  vec3 f0 = pbrParameters.f0;
  float reflectance = max(max(f0.r, f0.g), f0.b);
  vec3 f90 = vec3(clamp(reflectance * 25.0, 0.0, 1.0));
  vec3 F = fresnelSchlick2(f0, f90, VdotH);

  float alpha = pbrParameters.roughness;
  float G = smithVisibilityGGX(alpha, NdotL, NdotV);
  float D = GGX(alpha, NdotH);
  vec3 specularContribution = F * G * D / (4.0 * NdotL * NdotV);

  vec3 diffuseColor = pbrParameters.diffuseColor;
  // F here represents the specular contribution
  vec3 diffuseContribution = (1.0 - F) * lambertianDiffuse(diffuseColor);

  // Lo = kD * albedo/pi + specular * Li * NdotL
  return (diffuseContribution + specularContribution) + NdotL * lightColorHdr;
}
