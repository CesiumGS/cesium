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

#ifdef HAS_OUTLINES
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
#endif

vec3 computePbrLighting(ModelMaterial inputMaterial)
{
    czm_pbrParameters pbrParameters;
    pbrParameters.diffuseColor = inputMaterial.diffuse;
    pbrParameters.f0 = inputMaterial.specular;
    pbrParameters.roughness = inputMaterial.roughness;

    #ifndef USE_CUSTOM_LIGHT_COLOR
    vec3 lightColorHdr = czm_lightColorHdr;
    #else
    vec3 lightColorHdr = gltf_lightColor;
    #endif

    vec3 color = czm_pbrLighting(
        v_positionEC,
        inputMaterial.normal,
        czm_lightDirectionEC,
        lightColorHdr,
        pbrParameters
    );

    // TODO: what are the parameters for IBL?
    //color += czm_iblLighting(pbrParameters);
    color *= inputMaterial.occlusion;
    color += inputMaterial.emissive;

    // Convert high-dynamic range to low-dynamic range in HDR mode
    color = applyTonemapping(color);
    return color;
}

ModelMaterial lightingStage(ModelMaterial inputMaterial)
{
    // copying so normal
    ModelMaterial outputMaterial = inputMaterial;
    vec3 color = vec3(0.0);

    #ifdef LIGHTING_PBR
    color = computePbrLighting(inputMaterial);
    #else // unlit
    color = inputMaterial.diffuse;
    #endif

    color = LINEARtoSRGB(color);

    #ifdef HAS_OUTLINES
    color = handleOutlines(color);
    #endif

    outputMaterial.diffuse = color;
    return outputMaterial;
}