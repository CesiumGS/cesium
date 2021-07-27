vec3 SRGBtoLINEAR3(vec3 srgbIn) 
{
    return pow(srgbIn, vec3(2.2));
}

vec4 SRGBtoLINEAR4(vec4 srgbIn) 
{
    vec3 linearOut = pow(srgbIn.rgb, vec3(2.2));
    return vec4(linearOut, srgbIn.a);
}


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



#ifdef LIGHTING_PBR
ModelMaterial lightingStage(ModelMaterial inputMaterial)
{
  ModelMaterial outputMaterial = inputMaterial;
  // TODO: PBR Lighting
  // TODO: IBL Lighting
  // TODO: Tonemapping

  // TODO: Outlines
  // TODO: Handle Alpha

  return outputMaterial;
}
#else // LIGHTING_UNLIT
ModelMaterial lightingStage(ModelMaterial inputMaterial) 
{
  ModelMaterial outputMaterial = inputMaterial;
  outputMaterial.diffuse = LINEARtoSRGB(outputMaterial.diffuse);

  // TODO: Outlines
  // TODO: Handle alpha

  return outputMaterial;
}
#endif