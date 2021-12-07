#ifdef LIGHTING_PBR
vec3 computePbrLighting(czm_modelMaterial inputMaterial)
{
    czm_pbrParameters pbrParameters;
    pbrParameters.diffuseColor = inputMaterial.diffuse;
    pbrParameters.f0 = inputMaterial.specular;
    pbrParameters.roughness = inputMaterial.roughness;
    
    vec3 lightColorHdr = czm_lightColorHdr;

    vec3 color = inputMaterial.diffuse;
    #ifdef HAS_NORMALS
    color = czm_pbrLighting(
        v_positionEC,
        inputMaterial.normalEC,
        czm_lightDirectionEC,
        lightColorHdr,
        pbrParameters
    );
    #endif

    #ifdef USE_IBL_LIGHTING
    color += czm_imageBasedLighting(
        v_positionEC,
        czm_lightDirectionEC,
        lightColorHdr,
        pbrParameters
    );
    #endif
    color *= inputMaterial.occlusion;
    color += inputMaterial.emissive;

    // In HDR mode, the frame buffer is in linear color space. The
    // post-processing stages (see PostProcessStageCollection) will handle
    // tonemapping. However, if HDR is not enabled, we must tonemap else large
    // values may be clamped to 1.0
    #ifndef HDR 
    color = czm_acesTonemapping(color);
    #endif 

    return color;
}
#endif

void lightingStage(inout czm_modelMaterial material)
{
    // Even though the lighting will only set the diffuse color,
    // pass all other properties so further stages have access to them.
    vec3 color = vec3(0.0);

    #ifdef LIGHTING_PBR
    color = computePbrLighting(material);
    #else // unlit
    color = material.diffuse;
    #endif

    // If HDR is not enabled, the frame buffer stores sRGB colors rather than
    // linear colors so the linear value must be converted.
    #ifndef HDR
    color = czm_linearToSrgb(color);
    #endif

    material.diffuse = color;
}
