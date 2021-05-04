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
    vec3 normalEC,
    vec3 lightDirectionEC,
    vec3 lightColorHdr,
    vec4 baseColor,
    float metallic,
    float roughness,
    vec3 emissive,
    float occlusion
) {
  // based on glTF Viewer implementation: https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/master/source/Renderer/shaders/pbr.frag
  float indexOfRefraction = 1.5;
  float specularWeight = 1.0;

  vec3 f0 = vec3(0.04);
  vec3 c_diff = mix(baseColor.rgb * (vec3(1.0) - f0), vec3(0.0), metallic);

  roughness = clamp(roughness, 0.0, 1.0);
  metallic = clamp(metallic, 0.0, 1.0);

  // roughness is authored as perceptual roughness
  // square it to get material roughness
  // TODO: Research this
  float alphaRoughness = roughness * roughness;

  vec3 diffuse = vec3(0.0);
  vec3 specular = vec3(0.0);
  vec3 color = vec3(0.0);
  color = emissive + diffuse + specular;


  return vec4(1.0, 0.0, 1.0, 1.0);
}
