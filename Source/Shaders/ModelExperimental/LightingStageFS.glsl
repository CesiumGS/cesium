vec3 LINEARtoSRGB(vec3 linearIn) 
{
    #ifndef HDR 
    return pow(linearIn, vec3(1.0/2.2));
    #else 
    return linearIn;
    #endif 
}

#ifdef LIGHTING_PBR
vec3 applyTonemapping(vec3 linearIn) 
{
    #ifndef HDR 
    return czm_acesTonemapping(linearIn);
    #else 
    return linearIn;
    #endif 
}

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
        inputMaterial.normal,
        czm_lightDirectionEC,
        lightColorHdr,
        pbrParameters
    );
    #endif

    color *= inputMaterial.occlusion;
    color += inputMaterial.emissive;

    // Convert high-dynamic range to low-dynamic range in HDR mode
    color = applyTonemapping(color);
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

    color = LINEARtoSRGB(color);

    material.diffuse = color;
}
