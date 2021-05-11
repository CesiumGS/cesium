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
vec4 czm_pbrMetallicRoughness(
    vec3 normalEC, // n
    vec3 lightDirectionEC, // l
    vec3 lightColorHdr, // L (radiance)... is this already attenuated?
    vec4 baseColor,
    float metallic,
    float roughness,
    vec3 emissive,
    float occlusion
) {
  // TODO: How to get the position?
  vec3 v_positionEC = vec3(0.0, 0.0, 1.0);
  vec3 v = -normalize(v_positionEC);
  vec3 l = normalize(lightDirectionEC);
  vec3 h = normalize(v + l);
  vec3 n = normalEC;
  float NdotL = clamp(dot(n, l), 0.001, 1.0);
  float NdotV = abs(dot(n, v)) + 0.001;
  float NdotH = clamp(dot(n, h), 0.0, 1.0);
  float LdotH = clamp(dot(l, h), 0.0, 1.0);
  float VdotH = clamp(dot(v, h), 0.0, 1.0);

  // based on glTF Viewer implementation: https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/master/source/Renderer/shaders/pbr.frag
  //float indexOfRefraction = 1.5;
  //float specularWeight = 1.0;

  // dielectrics us f0 = 0.04, metals use albedo as f0
  metallic = clamp(metallic, 0.0, 1.0);
  vec3 f0 = vec3(0.04);
  vec3 specularColor = mix(f0, baseColor.rgb, metallic);
  float reflectance = max(max(specularColor.r, specularColor.g), specularColor.b);
  vec3 r90 = vec3(clamp(reflectance * 25.0, 0.0, 1.0));
  vec3 r0 = specularColor.rgb;
  vec3 F = fresnelSchlick2(r0, r90, VdotH);

  // roughness is authored as perceptual roughness
  // square it to get material roughness
  roughness = clamp(roughness, 0.0, 1.0);
  float alpha = roughness * roughness;
  float G = smithVisibilityGGX(alpha, NdotL, NdotV);
  float D = GGX(alpha, NdotH);
  vec3 specularContribution = F * G * D / (4.0 * NdotL * NdotV);

  // diffuse only applies to dielectrics.
  vec3 diffuseColor = baseColor.rgb * (1.0 - f0) * (1.0 - metallic);
  // F here represents the specular contribution
  vec3 diffuseContribution = (1.0 - F) * lambertianDiffuse(diffuseColor);

  // Lo = kD * albedo/pi + specular * Li * NdotL
  vec3 color = (diffuseContribution + specularContribution) + NdotL * lightColorHdr;

  vec3 ambient = vec3(0.03) * baseColor.rgb * occlusion;
  color += emissive + ambient;

  return vec4(color, 1.0);
}
