vec3 applyTonemapping(vec3 linearIn) 
{
    #ifndef HDR 
    return czm_acesTonemapping(linearIn);
    #else 
    return linearIn;
    #endif 
}


vec3 LINEARtoSRGB(vec3 linearIn) 
{
    #ifndef HDR 
    return pow(linearIn, vec3(1.0/2.2));
    #else 
    return linearIn;
    #endif 
}

vec3 handleOutlines(vec3 color) 
{
    float outlineness = max(
        texture2D(u_outlineTexture, vec2(v_outlineCoordinates.x, 0.5)).r,
        max(
            texture2D(u_outlineTexture, vec2(v_outlineCoordinates.y, 0.5)).r,
            texture2D(u_outlineTexture, vec2(v_outlineCoordinates.z, 0.5)).r
        )
    );
    return mix(color, vec3(0.0, 0.0, 0.0), outlineness);
}

vec4 handleAlpha(vec3 color, float alpha)
{
    #if defined(ALPHA_MODE_MASK)
    if (alpha < u_alphaCutoff) {
        discard;
    }
    return vec4(color, 1.0)
    #elif defined(ALPHA_MODE_BLEND)
    return vec4(color, alpha);
    #else // OPAQUE
    return vec4(color, 1.0);
    #endif
}

#ifdef LIGHTING_PBR
ModelMaterial lightingStage(ModelMaterial inputMaterial)
{
  ModelMaterial outputMaterial = inputMaterial;

  czm_pbrParameters pbrParameters;
  pbrParameters.diffuseColor = inputMaterial.baseColor.rgb;
  pbrParameters.f0 = inputMaterial.specular;
  pbrParameters.roughness = inputMaterial.roughness;

  #ifndef USE_CUSTOM_LIGHT_COLOR
  vec3 lightColorHdr = czm_lightColorHdr;
  #else
  vec3 lightColorHdr = gltf_lightColor;
  #endif

  vec3 color = czm_pbrLighting(
    v_positionEC
    inputMaterial.normal,
    czm_lightDirectionEC,
    lightColorHdr,
    pbrParameters
  );

  // TODO: what are the parameters for IBL?
  color += czm_iblLighting();
  color *= inputMaterial.occlusion;
  color += inputMaterial.emissive;
  color = applyTonemapping(color);

  color = LINEARtoSRGB(color);

  #ifdef HAS_OUTLINES
  color = handleOutlines(color);
  #endif

  outputMaterial.baseColor = handleAlpha(color, inputMaterial.baseColor.alpha);
  return outputMaterial;
}
#else // LIGHTING_UNLIT
ModelMaterial lightingStage(ModelMaterial inputMaterial) 
{
  // TODO: copy all properties or just 
  ModelMaterial outputMaterial = inputMaterial;
  vec3 color = inputMaterial.baseColor.rgb;

  color = LINEARtoSRGB(color);
  #ifdef HAS_OUTLINES
  color = handleOutlines(color);
  #endif

  outputMaterial.baseColor = handleAlpha(color, inputMaterial.baseColor.alpha);
  return outputMaterial;
}
#endif